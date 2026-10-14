package com.prefetch.controller;

import com.prefetch.model.InventoryItem;
import com.prefetch.service.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.concurrent.ExecutionException;

@RestController
@RequestMapping("/api/inventory")
@RequiredArgsConstructor
public class InventoryController {

    private final InventoryService inventoryService;

    @GetMapping
    public ResponseEntity<List<InventoryItem>> getAllInventory()
            throws ExecutionException, InterruptedException {
        List<InventoryItem> items = inventoryService.getAllInventory();
        return ResponseEntity.ok(items);
    }

    @GetMapping("/{itemId}")
    public ResponseEntity<InventoryItem> getItemById(@PathVariable String itemId)
            throws ExecutionException, InterruptedException {
        InventoryItem item = inventoryService.getItemById(itemId);
        return ResponseEntity.ok(item);
    }
}
