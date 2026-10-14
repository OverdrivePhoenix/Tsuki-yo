package com.prefetch.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;

@Slf4j
@Service
public class PaymentService {

    @Value("${prefetch.merchant.upi-id:marian.coop@okaxis}")
    private String merchantUpiId;

    @Value("${prefetch.merchant.name:Marian Co-Operative Store}")
    private String merchantName;

    /**
     * Constructs a compliant Indian Unified Payments Interface (UPI 2.0) Deep-Link URL.
     * Format: upi://pay?pa={MERCHANT_UPI_ID}&pn={MERCHANT_NAME}&tr={ORDER_ID}&am={AMOUNT}&cu=INR&tn={TOKEN}
     *
     * @param orderId     Internal Firestore order ID
     * @param tokenNumber Human-friendly token e.g. "#FETCH-8802"
     * @param amount      Order total in INR
     * @return Formatted UPI intent URL
     */
    public String generateUpiDeepLink(String orderId, String tokenNumber, double amount) {
        String formattedAmount = String.format(Locale.US, "%.2f", amount);
        String encodedMerchantName = URLEncoder.encode(merchantName, StandardCharsets.UTF_8);
        String encodedNote = URLEncoder.encode("PreFetch Token " + tokenNumber, StandardCharsets.UTF_8);

        String upiUrl = String.format(
                "upi://pay?pa=%s&pn=%s&tr=%s&am=%s&cu=INR&tn=%s",
                merchantUpiId,
                encodedMerchantName,
                orderId,
                formattedAmount,
                encodedNote
        );

        log.debug("Generated dynamic Google Pay UPI URL for order {}: {}", orderId, upiUrl);
        return upiUrl;
    }

    public String getMerchantUpiId() {
        return merchantUpiId;
    }
}
