package com.prefetch.dto;

import com.prefetch.model.ItemVariant;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InventoryUpdateRequest {
    private Integer stock;
    private Double price;
    private Boolean isActive;
    private List<ItemVariant> variants;
}
