package com.prefetch.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.prefetch.dto.CartItemDto;
import com.prefetch.dto.CheckoutRequest;
import com.prefetch.dto.CheckoutResponse;
import com.prefetch.exception.InsufficientStockException;
import com.prefetch.exception.ResourceNotFoundException;
import com.prefetch.model.InventoryItem;
import com.prefetch.model.ItemVariant;
import com.prefetch.model.Order;
import com.prefetch.model.OrderItem;
import com.prefetch.model.OrderStatus;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrderService {

    private final Firestore firestore;
    private final PaymentService paymentService;
    private final InventoryService inventoryService;

    private static final String ORDERS_COLLECTION = "orders";
    private static final String INVENTORY_COLLECTION = "inventory";

    // In-memory order cache for offline/demo resiliency
    private final Map<String, Order> memoryOrderStore = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        seedInitialOrders();
    }

    /**
     * Executes atomic concurrency-safe checkout with multi-document locking.
     */
    public CheckoutResponse checkoutWithAtomicLock(CheckoutRequest request) {
        String tokenNumber = "#FETCH-" + (1000 + new Random().nextInt(9000));
        String orderId = UUID.randomUUID().toString();
        String tokenHash = UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        if (firestore != null) {
            try {
                return firestore.runTransaction(transaction -> {
                    double totalAmount = 0.0;
                    List<OrderItem> orderItems = new ArrayList<>();

                    for (CartItemDto cartItem : request.getItems()) {
                        DocumentReference itemRef = firestore.collection(INVENTORY_COLLECTION).document(cartItem.getItemId());
                        DocumentSnapshot snapshot = transaction.get(itemRef).get();

                        if (!snapshot.exists()) {
                            throw new ResourceNotFoundException("Item not found: " + cartItem.getItemId());
                        }

                        InventoryItem item = snapshot.toObject(InventoryItem.class);
                        if (item == null || Boolean.FALSE.equals(item.getIsActive())) {
                            throw new InsufficientStockException("Item " + (item != null ? item.getName() : cartItem.getItemId()) + " is temporarily disabled.");
                        }

                        int requestedQty = cartItem.getQuantity();

                        // Variant-level stock check
                        if (cartItem.getVariant() != null && !cartItem.getVariant().isBlank() && item.getVariants() != null) {
                            String variantQuery = cartItem.getVariant().replace("SIZE ", "").trim();
                            ItemVariant matchedVariant = null;
                            for (ItemVariant v : item.getVariants()) {
                                if (v.getSize().equalsIgnoreCase(variantQuery)) {
                                    matchedVariant = v;
                                    break;
                                }
                            }

                            if (matchedVariant != null) {
                                if (matchedVariant.getStock() < requestedQty) {
                                    throw new InsufficientStockException("Insufficient stock for " + item.getName() + " (" + matchedVariant.getSize() + "). Available: " + matchedVariant.getStock());
                                }
                                matchedVariant.setStock(matchedVariant.getStock() - requestedQty);
                            }
                        }

                        // Base stock check
                        if (item.getStock() < requestedQty) {
                            throw new InsufficientStockException("Insufficient stock for " + item.getName() + ". Available: " + item.getStock());
                        }

                        item.setStock(item.getStock() - requestedQty);
                        transaction.set(itemRef, item);

                        double linePrice = item.getPrice() * requestedQty;
                        totalAmount += linePrice;

                        orderItems.add(OrderItem.builder()
                                .itemId(item.getItemId())
                                .name(item.getName())
                                .variant(cartItem.getVariant())
                                .qty(requestedQty)
                                .price(item.getPrice())
                                .rackLocation(item.getRackLocation())
                                .checked(false)
                                .build());
                    }

                    String upiUrl = paymentService.generateUpiDeepLink(orderId, tokenNumber, totalAmount);

                    Order newOrder = Order.builder()
                            .orderId(orderId)
                            .tokenNumber(tokenNumber)
                            .tokenHash(tokenHash)
                            .userId(request.getUserId())
                            .studentName(request.getStudentName())
                            .rollNumber(request.getRollNumber())
                            .department(request.getDepartment())
                            .items(orderItems)
                            .totalAmount(totalAmount)
                            .status(OrderStatus.PAID)
                            .upiDeepLink(upiUrl)
                            .createdAt(System.currentTimeMillis())
                            .build();

                    DocumentReference orderRef = firestore.collection(ORDERS_COLLECTION).document(orderId);
                    transaction.set(orderRef, newOrder);
                    memoryOrderStore.put(orderId, newOrder);

                    return CheckoutResponse.builder()
                            .orderId(orderId)
                            .tokenNumber(tokenNumber)
                            .tokenHash(tokenHash)
                            .totalAmount(totalAmount)
                            .upiDeepLink(upiUrl)
                            .status(OrderStatus.PAID)
                            .message("Concurrency lock secured. Token generated.")
                            .reservedUntilMillis(System.currentTimeMillis() + (10 * 60 * 1000))
                            .build();
                }).get();
            } catch (Exception e) {
                log.warn("Firestore transaction failed or offline, falling back to local memory store: {}", e.getMessage());
                if (e.getCause() instanceof InsufficientStockException) {
                    throw (InsufficientStockException) e.getCause();
                }
                if (e.getCause() instanceof ResourceNotFoundException) {
                    throw (ResourceNotFoundException) e.getCause();
                }
            }
        }

        // Local Memory Fallback when Firestore is not connected
        synchronized (memoryOrderStore) {
            double totalAmount = 0.0;
            List<OrderItem> orderItems = new ArrayList<>();

            for (CartItemDto cartItem : request.getItems()) {
                try {
                    InventoryItem item = inventoryService.getItemById(cartItem.getItemId());
                    if (Boolean.FALSE.equals(item.getIsActive())) {
                        throw new InsufficientStockException("Item " + item.getName() + " is temporarily disabled.");
                    }

                    int requestedQty = cartItem.getQuantity();
                    if (item.getStock() < requestedQty) {
                        throw new InsufficientStockException("Insufficient stock for " + item.getName() + ". Available: " + item.getStock());
                    }

                    item.setStock(item.getStock() - requestedQty);
                    double linePrice = item.getPrice() * requestedQty;
                    totalAmount += linePrice;

                    orderItems.add(OrderItem.builder()
                            .itemId(item.getItemId())
                            .name(item.getName())
                            .variant(cartItem.getVariant())
                            .qty(requestedQty)
                            .price(item.getPrice())
                            .rackLocation(item.getRackLocation())
                            .checked(false)
                            .build());
                } catch (Exception ex) {
                    throw new InsufficientStockException("Could not verify item " + cartItem.getItemId() + ": " + ex.getMessage());
                }
            }

            String upiUrl = paymentService.generateUpiDeepLink(orderId, tokenNumber, totalAmount);
            Order newOrder = Order.builder()
                    .orderId(orderId)
                    .tokenNumber(tokenNumber)
                    .tokenHash(tokenHash)
                    .userId(request.getUserId())
                    .studentName(request.getStudentName())
                    .rollNumber(request.getRollNumber())
                    .department(request.getDepartment())
                    .items(orderItems)
                    .totalAmount(totalAmount)
                    .status(OrderStatus.PAID)
                    .upiDeepLink(upiUrl)
                    .createdAt(System.currentTimeMillis())
                    .build();

            memoryOrderStore.put(orderId, newOrder);

            return CheckoutResponse.builder()
                    .orderId(orderId)
                    .tokenNumber(tokenNumber)
                    .tokenHash(tokenHash)
                    .totalAmount(totalAmount)
                    .upiDeepLink(upiUrl)
                    .status(OrderStatus.PAID)
                    .message("Order processed successfully.")
                    .reservedUntilMillis(System.currentTimeMillis() + (10 * 60 * 1000))
                    .build();
        }
    }

    public Order confirmPayment(String orderId, String upiTxnRef) throws ExecutionException, InterruptedException {
        Order order = getOrderById(orderId);
        order.setUpiTxnRef(upiTxnRef);
        order.setStatus(OrderStatus.PAID);
        order.setPaidAt(System.currentTimeMillis());

        if (firestore != null) {
            try {
                firestore.collection(ORDERS_COLLECTION).document(orderId)
                        .update("upiTxnRef", upiTxnRef, "status", OrderStatus.PAID.name(), "paidAt", order.getPaidAt())
                        .get();
            } catch (Exception e) {
                log.warn("Firestore confirmPayment update failed: {}", e.getMessage());
            }
        }
        memoryOrderStore.put(orderId, order);
        return order;
    }

    public Order getOrderById(String orderId) throws ExecutionException, InterruptedException {
        if (firestore != null) {
            try {
                DocumentSnapshot doc = firestore.collection(ORDERS_COLLECTION).document(orderId).get().get();
                if (doc.exists()) {
                    return doc.toObject(Order.class);
                }
            } catch (Exception e) {
                log.warn("Firestore getOrderById failed: {}", e.getMessage());
            }
        }

        // Try lookup by orderId or tokenNumber
        Order order = memoryOrderStore.get(orderId);
        if (order == null) {
            for (Order o : memoryOrderStore.values()) {
                if (o.getTokenNumber().equalsIgnoreCase(orderId) || o.getTokenNumber().replace("#", "").equalsIgnoreCase(orderId.replace("#", ""))) {
                    return o;
                }
            }
            throw new ResourceNotFoundException("Order not found: " + orderId);
        }
        return order;
    }

    public List<Order> getLiveOrders() throws ExecutionException, InterruptedException {
        if (firestore != null) {
            try {
                ApiFuture<QuerySnapshot> future = firestore.collection(ORDERS_COLLECTION)
                        .orderBy("createdAt", Query.Direction.DESCENDING)
                        .get();
                List<QueryDocumentSnapshot> docs = future.get().getDocuments();
                if (!docs.isEmpty()) {
                    List<Order> list = new ArrayList<>();
                    for (QueryDocumentSnapshot doc : docs) {
                        list.add(doc.toObject(Order.class));
                    }
                    return list;
                }
            } catch (Exception e) {
                log.warn("Firestore getLiveOrders failed, returning memory store: {}", e.getMessage());
            }
        }
        List<Order> list = new ArrayList<>(memoryOrderStore.values());
        list.sort((a, b) -> Long.compare(b.getCreatedAt() != null ? b.getCreatedAt() : 0, a.getCreatedAt() != null ? a.getCreatedAt() : 0));
        return list;
    }

    public Order markOrderCollected(String orderId) throws ExecutionException, InterruptedException {
        Order order = getOrderById(orderId);
        order.setStatus(OrderStatus.COLLECTED);
        order.setCollectedAt(System.currentTimeMillis());
        order.setTokenHash("INVALIDATED_AT_" + System.currentTimeMillis());
        if (order.getItems() != null) {
            for (OrderItem i : order.getItems()) {
                i.setChecked(true);
            }
        }

        if (firestore != null) {
            try {
                firestore.collection(ORDERS_COLLECTION).document(order.getOrderId()).set(order).get();
            } catch (Exception e) {
                log.warn("Firestore markOrderCollected update failed: {}", e.getMessage());
            }
        }
        memoryOrderStore.put(order.getOrderId(), order);
        log.info("Token for order {} invalidated and marked COLLECTED", orderId);
        return order;
    }

    private void seedInitialOrders() {
        Order o1 = Order.builder()
                .orderId("order-8802")
                .tokenNumber("#FETCH-8802")
                .tokenHash("8f9b2c1a")
                .studentName("Rahul K. Nair")
                .rollNumber("MEC22CS089")
                .department("S4 CSE")
                .totalAmount(480.0)
                .status(OrderStatus.PAID)
                .createdAt(System.currentTimeMillis() - (105 * 1000))
                .items(List.of(
                        OrderItem.builder().itemId("item-lab-coat").name("S4 CSE Lab Coat").variant("SIZE L").qty(1).price(420.0).rackLocation("RACK B-02").checked(true).build(),
                        OrderItem.builder().itemId("item-drafter").name("Engineering Graphics Mini-Drafter").variant(null).qty(1).price(380.0).rackLocation("RACK A-04").checked(true).build()
                ))
                .build();

        Order o2 = Order.builder()
                .orderId("order-8801")
                .tokenNumber("#FETCH-8801")
                .tokenHash("3d7e1a90")
                .studentName("Ananya S.")
                .rollNumber("MEC22EC012")
                .department("S2 ECE")
                .totalAmount(890.0)
                .status(OrderStatus.PREPARING)
                .createdAt(System.currentTimeMillis() - (240 * 1000))
                .items(List.of(
                        OrderItem.builder().itemId("item-hoodie").name("Marian Crest Heavyweight Zip Hoodie").variant("SIZE M").qty(1).price(890.0).rackLocation("Hanger Stand 4").checked(false).build()
                ))
                .build();

        Order o3 = Order.builder()
                .orderId("order-8798")
                .tokenNumber("#FETCH-8798")
                .tokenHash("e2a4c701")
                .studentName("Kevin Varghese")
                .rollNumber("MEC21ME044")
                .department("S6 ME")
                .totalAmount(1350.0)
                .status(OrderStatus.READY_FOR_PICKUP)
                .createdAt(System.currentTimeMillis() - (480 * 1000))
                .items(List.of(
                        OrderItem.builder().itemId("item-calc").name("Casio fx-991CW Scientific Calculator").variant(null).qty(1).price(1350.0).rackLocation("Glass Case 3").checked(true).build()
                ))
                .build();

        memoryOrderStore.put(o1.getOrderId(), o1);
        memoryOrderStore.put(o2.getOrderId(), o2);
        memoryOrderStore.put(o3.getOrderId(), o3);
    }
}
