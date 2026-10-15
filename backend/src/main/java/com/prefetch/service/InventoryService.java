package com.prefetch.service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.prefetch.dto.InventoryUpdateRequest;
import com.prefetch.exception.ResourceNotFoundException;
import com.prefetch.model.InventoryItem;
import com.prefetch.model.ItemVariant;
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
public class InventoryService {

    private final Firestore firestore;
    private static final String COLLECTION_NAME = "inventory";

    // In-memory fallback cache when running in demo/offline mode
    private final Map<String, InventoryItem> memoryStore = new ConcurrentHashMap<>();

    @PostConstruct
    public void init() {
        seedInitialCatalog();
    }

    public List<InventoryItem> getAllInventory() throws ExecutionException, InterruptedException {
        if (firestore != null) {
            try {
                ApiFuture<QuerySnapshot> future = firestore.collection(COLLECTION_NAME).get();
                List<QueryDocumentSnapshot> docs = future.get().getDocuments();
                if (!docs.isEmpty()) {
                    List<InventoryItem> items = new ArrayList<>();
                    for (QueryDocumentSnapshot doc : docs) {
                        items.add(doc.toObject(InventoryItem.class));
                    }
                    return items;
                }
            } catch (Exception e) {
                log.warn("Firestore query failed, using local cache: {}", e.getMessage());
            }
        }
        return new ArrayList<>(memoryStore.values());
    }

    public InventoryItem getItemById(String itemId) throws ExecutionException, InterruptedException {
        if (firestore != null) {
            try {
                DocumentSnapshot doc = firestore.collection(COLLECTION_NAME).document(itemId).get().get();
                if (doc.exists()) {
                    return doc.toObject(InventoryItem.class);
                }
            } catch (Exception e) {
                log.warn("Firestore getItem failed, checking memory store: {}", e.getMessage());
            }
        }
        InventoryItem item = memoryStore.get(itemId);
        if (item == null) {
            throw new ResourceNotFoundException("Item not found: " + itemId);
        }
        return item;
    }

    public InventoryItem updateInventory(String itemId, InventoryUpdateRequest request) throws ExecutionException, InterruptedException {
        InventoryItem current = getItemById(itemId);
        if (request.getStock() != null) current.setStock(request.getStock());
        if (request.getPrice() != null) current.setPrice(request.getPrice());
        if (request.getIsActive() != null) current.setActive(request.getIsActive());
        if (request.getVariants() != null) current.setVariants(request.getVariants());

        if (firestore != null) {
            try {
                firestore.collection(COLLECTION_NAME).document(itemId).set(current).get();
            } catch (Exception e) {
                log.warn("Firestore update failed: {}", e.getMessage());
            }
        }
        memoryStore.put(itemId, current);
        log.info("Inventory item {} updated. New Stock: {}, Price: Rs.{}", itemId, current.getStock(), current.getPrice());
        return current;
    }

    public InventoryItem toggleKillSwitch(String itemId, boolean active) throws ExecutionException, InterruptedException {
        InventoryItem current = getItemById(itemId);
        current.setActive(active);

        if (firestore != null) {
            try {
                firestore.collection(COLLECTION_NAME).document(itemId).update("active", active).get();
            } catch (Exception e) {
                log.warn("Firestore kill switch update failed: {}", e.getMessage());
            }
        }
        memoryStore.put(itemId, current);
        log.info("Kill-switch triggered for item: {} -> active: {}", itemId, active);
        return current;
    }

    private void seedInitialCatalog() {
        List<InventoryItem> seeds = List.of(
                InventoryItem.builder()
                        .itemId("item-lab-coat")
                        .name("Navy Blue Workshop & Chemistry Lab Coat")
                        .subtitle("Poly-cotton blend with embroidered MEC Marian Crest & side utility pockets")
                        .category("Lab Supplies")
                        .department("Mechanical")
                        .semester("S2 ME")
                        .stock(4)
                        .price(420.0)
                        .rackLocation("Rack B2 • Shelf 1")
                        .isActive(true)
                        .variants(List.of(
                                ItemVariant.builder().size("S").stock(0).build(),
                                ItemVariant.builder().size("M").stock(2).build(),
                                ItemVariant.builder().size("L").stock(1).build(),
                                ItemVariant.builder().size("XL").stock(1).build()
                        ))
                        .build(),
                InventoryItem.builder()
                        .itemId("item-drafter")
                        .name("Omega Mini Drafter with Marian Canvas Case")
                        .subtitle("Dual protractor scale 360°, stainless steel arm for Engineering Graphics")
                        .category("Lab Supplies")
                        .department("Civil")
                        .semester("S1/S2 All")
                        .stock(8)
                        .price(380.0)
                        .rackLocation("Rack A1 • Top")
                        .isActive(true)
                        .variants(List.of(
                                ItemVariant.builder().size("Standard").stock(8).build()
                        ))
                        .build(),
                InventoryItem.builder()
                        .itemId("item-calc")
                        .name("Casio fx-991CW ClassWiz Scientific Calculator")
                        .subtitle("KTU exam compliant, high-resolution 4-gradation display with QR code analysis")
                        .category("Stationery")
                        .department("Computer Science")
                        .semester("S4 CSE")
                        .stock(12)
                        .price(1350.0)
                        .rackLocation("Glass Case 3")
                        .isActive(true)
                        .variants(List.of(
                                ItemVariant.builder().size("Standard").stock(12).build()
                        ))
                        .build(),
                InventoryItem.builder()
                        .itemId("item-hoodie")
                        .name("Marian Crest Heavyweight Zip Hoodie")
                        .subtitle("450 GSM fleece, embroidered MEC crest with metallic copper accents")
                        .category("MEC Merch")
                        .department("All")
                        .semester("All Semesters")
                        .stock(9)
                        .price(890.0)
                        .rackLocation("Hanger Stand 4")
                        .isActive(true)
                        .variants(List.of(
                                ItemVariant.builder().size("S").stock(2).build(),
                                ItemVariant.builder().size("M").stock(3).build(),
                                ItemVariant.builder().size("L").stock(2).build(),
                                ItemVariant.builder().size("XL").stock(2).build()
                        ))
                        .build()
        );

        for (InventoryItem item : seeds) {
            memoryStore.put(item.getItemId(), item);
            if (firestore != null) {
                try {
                    firestore.collection(COLLECTION_NAME).document(item.getItemId()).set(item);
                } catch (Exception ignored) {}
            }
        }
    }
}
