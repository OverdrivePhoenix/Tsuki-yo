package com.prefetch.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutRequest {
    private String userId;
    private String studentName;
    private String rollNumber;
    private String department;
    
    @NotEmpty(message = "Cart cannot be empty")
    @Valid
    private List<CartItemDto> items;
}
