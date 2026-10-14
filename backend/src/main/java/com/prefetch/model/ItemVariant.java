package com.prefetch.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ItemVariant {
    private String size;        // e.g. "S", "M", "L", "XL"
    private int stock;          // specific stock dedicated to this variant
    private Double priceModifier; // optional extra cost or delta
}
