package com.prefetch.controller;

import com.prefetch.dto.InventoryUpdateRequest;
import com.prefetch.model.InventoryItem;
import com.prefetch.model.Order;
import com.prefetch.service.InventoryService;
import com.prefetch.service.OrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.ExecutionException;

@Slf4j
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final OrderService orderService;
    private final InventoryService inventoryService;

    @GetMapping("/orders")
    public ResponseEntity<List<Order>> getAdminOrderQueue()
            throws ExecutionException, InterruptedException {
        return ResponseEntity.ok(orderService.getLiveOrders());
    }

    /**
     * Single-click verification that invalidates the token hash and sets order to COLLECTED.
     */
    @PostMapping("/orders/{orderId}/collect")
    public ResponseEntity<Order> markCollected(@PathVariable String orderId)
            throws ExecutionException, InterruptedException {
        log.info("Counter desk Station 01 invalidating token for order: {}", orderId);
        Order order = orderService.markOrderCollected(orderId);
        return ResponseEntity.ok(order);
    }

    /**
     * Modify stock counters, prices, or variants for an inventory item.
     */
    @PatchMapping("/inventory/{itemId}")
    public ResponseEntity<InventoryItem> updateInventory(
            @PathVariable String itemId,
            @RequestBody InventoryUpdateRequest request)
            throws ExecutionException, InterruptedException {
        InventoryItem updated = inventoryService.updateInventory(itemId, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Store Clerk Instant Kill-Switch: immediately disable/enable an item.
     */
    @PostMapping("/inventory/{itemId}/kill-switch")
    public ResponseEntity<InventoryItem> toggleKillSwitch(
            @PathVariable String itemId,
            @RequestParam boolean active)
            throws ExecutionException, InterruptedException {
        InventoryItem item = inventoryService.toggleKillSwitch(itemId, active);
        return ResponseEntity.ok(item);
    }

    /**
     * Central Depot Reorder dispatch trigger from Spring AI predictive alert.
     */
    @PostMapping("/reorder-alert")
    public ResponseEntity<Map<String, Object>> dispatchCentralReorder(@RequestBody Map<String, Object> payload) {
        log.info("Spring AI Predictive Reorder PO dispatched to Marian Central Depot: {}", payload);
        return ResponseEntity.ok(Map.of(
                "status", "DISPATCHED",
                "poNumber", "PO-" + System.currentTimeMillis() % 100000,
                "message", "Central Reorder PO dispatched to Marian Central Depot for rapid replenishment."
        ));
    }
}
