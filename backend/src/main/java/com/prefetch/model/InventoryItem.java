package com.prefetch.model;

import com.google.cloud.firestore.annotation.DocumentId;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryItem {
    @DocumentId
    private String itemId;
    private String name;
    private String subtitle;
    private String category;      // "Textbooks" | "Lab Supplies" | "Stationery" | "MEC Merch"
    private String department;    // "Computer Science", "Mechanical", "ECE", "Common"
    private String semester;      // "S1", "S2", "S4", "S6", "S8"
    private int stock;            // aggregate/base stock
    private double price;
    private String rackLocation;  // e.g. "RACK A-04"
    private String fastVelocityText;
    
    @Builder.Default
    private List<ItemVariant> variants = new ArrayList<>();
    
    @Builder.Default
    private Boolean isActive = true; // instant Kill-Switch toggle
}
