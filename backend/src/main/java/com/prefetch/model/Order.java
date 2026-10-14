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
public class Order {
    @DocumentId
    private String orderId;
    private String tokenNumber;     // e.g. "#FETCH-8802"
    private String tokenHash;       // cryptographic validation hash
    private String userId;
    private String studentName;
    private String rollNumber;
    private String department;
    
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();
    
    private double totalAmount;
    private OrderStatus status;      // PENDING | PAID | COLLECTED
    private String upiTxnRef;        // student submitted UTR or payment gateway ref
    private String upiDeepLink;      // upi://pay?pa=...
    private Long createdAt;          // epoch timestamp millis
    private Long paidAt;
    private Long collectedAt;        // time token was invalidated
}
