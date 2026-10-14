package com.prefetch.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentConfirmRequest {
    @NotBlank(message = "Order ID is required")
    private String orderId;

    @NotBlank(message = "UPI Reference (UTR) is required")
    private String upiTxnRef;
}
