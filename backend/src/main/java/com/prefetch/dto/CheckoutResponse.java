package com.prefetch.dto;

import com.prefetch.model.OrderStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CheckoutResponse {
    private String orderId;
    private String tokenNumber;
    private String tokenHash;
    private double totalAmount;
    private String upiDeepLink;
    private OrderStatus status;
    private String message;
    private long reservedUntilMillis;
}
