package com.prefetch.controller;

import com.prefetch.dto.CheckoutRequest;
import com.prefetch.dto.CheckoutResponse;
import com.prefetch.dto.PaymentConfirmRequest;
import com.prefetch.model.Order;
import com.prefetch.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.ExecutionException;

@Slf4j
@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;

    /**
     * Endpoint for high-velocity pre-ordering with atomic inventory race-condition protection.
     */
    @PostMapping("/checkout")
    public ResponseEntity<CheckoutResponse> checkout(@Valid @RequestBody CheckoutRequest request) {
        log.info("Received checkout request for student: {} ({}) with {} items",
                request.getStudentName(), request.getRollNumber(), request.getItems().size());
        CheckoutResponse response = orderService.checkoutWithAtomicLock(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Student UPI Payment confirmation webhook/callback endpoint.
     */
    @PostMapping("/confirm-payment")
    public ResponseEntity<Order> confirmPayment(@Valid @RequestBody PaymentConfirmRequest request)
            throws ExecutionException, InterruptedException {
        log.info("Processing UPI payment confirmation for order {} with UTR: {}",
                request.getOrderId(), request.getUpiTxnRef());
        Order updatedOrder = orderService.confirmPayment(request.getOrderId(), request.getUpiTxnRef());
        return ResponseEntity.ok(updatedOrder);
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<Order> getOrder(@PathVariable String orderId)
            throws ExecutionException, InterruptedException {
        Order order = orderService.getOrderById(orderId);
        return ResponseEntity.ok(order);
    }

    @GetMapping("/live")
    public ResponseEntity<List<Order>> getLiveOrders()
            throws ExecutionException, InterruptedException {
        List<Order> orders = orderService.getLiveOrders();
        return ResponseEntity.ok(orders);
    }
}
