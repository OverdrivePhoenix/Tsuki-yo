package com.prefetch.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderItem {
    private String itemId;
    private String name;
    private String variant;      // e.g. "Size L" or null
    private int qty;
    private double price;
    private String rackLocation; // physical bin e.g. "RACK A-04"
    private boolean checked;     // admin physical checklist tick
}
