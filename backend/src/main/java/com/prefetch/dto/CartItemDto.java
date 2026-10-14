package com.prefetch.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartItemDto {
    @NotBlank(message = "Item ID is required")
    private String itemId;
    
    private String variant;  // e.g. "Size L" or "L" or null
    
    @Min(value = 1, message = "Quantity must be at least 1")
    private int quantity;
}
