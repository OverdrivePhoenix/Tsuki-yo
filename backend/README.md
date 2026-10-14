# PreFetch Backend — Java Spring Boot 3.x & Firebase Firestore Sync

High-velocity campus eCommerce platform engineered for **Marian Engineering College (MEC)** cooperative store fulfillment.

---

## 🛠 Technology Stack

* **Language & Runtime:** Java 17+
* **Framework:** Spring Boot 3.3.4 (RESTful Web APIs, Spring Security 6)
* **Cloud Database & Sync:** Google Firebase Cloud Firestore via Firebase Admin Java SDK 9.3.0
* **Concurrency Protection:** Multi-document atomic isolation using `firestore.runTransaction()`
* **Payments:** Google Pay Native UPI 2.0 Deep-Link QR Automation (`upi://pay?pa=...`)
* **Security:** Stateless Firebase Auth JWT Verification (`FirebaseAuthFilter`)

---

## 📂 Backend Architecture

```
backend/
├── pom.xml                                      # Maven dependencies
├── src/
│   ├── main/
│   │   ├── java/com/prefetch/
│   │   │   ├── PrefetchApplication.java         # Spring Boot entry point
│   │   │   ├── config/
│   │   │   │   ├── FirebaseConfig.java          # FirebaseApp & Firestore bean init
│   │   │   │   └── SecurityConfig.java          # Stateless JWT & CORS configuration
│   │   │   ├── controller/
│   │   │   │   ├── AdminController.java         # Counter desk order invalidation & Kill-Switch
│   │   │   │   ├── InventoryController.java     # Public live catalog query
│   │   │   │   └── OrderController.java         # Atomic checkout & payment confirmation
│   │   │   ├── dto/
│   │   │   │   ├── CartItemDto.java
│   │   │   │   ├── CheckoutRequest.java
│   │   │   │   ├── CheckoutResponse.java
│   │   │   │   ├── InventoryUpdateRequest.java
│   │   │   │   └── PaymentConfirmRequest.java
│   │   │   ├── exception/
│   │   │   │   ├── GlobalExceptionHandler.java  # Structured REST error formats
│   │   │   │   ├── InsufficientStockException.java # Race condition trigger
│   │   │   │   └── ResourceNotFoundException.java
│   │   │   ├── model/
│   │   │   │   ├── InventoryItem.java           # Firestore inventory schema
│   │   │   │   ├── ItemVariant.java             # S/M/L/XL size matrices
│   │   │   │   ├── Order.java                   # Order ticket & token hash schema
│   │   │   │   ├── OrderItem.java
│   │   │   │   ├── OrderStatus.java             # PENDING | PAID | COLLECTED
│   │   │   │   ├── User.java                    # RBAC student/admin profiles
│   │   │   │   └── UserRole.java
│   │   │   ├── security/
│   │   │   │   └── FirebaseAuthFilter.java      # Bearer token validation
│   │   │   └── service/
│   │   │       ├── InventoryService.java        # Inventory CRUD & Kill-Switch
│   │   │       ├── OrderService.java            # Atomic checkout via firestore.runTransaction()
│   │   │       └── PaymentService.java          # Indian UPI 2.0 URL construction
│   │   └── resources/
│   │       ├── application.yml                  # Config properties
│   │       └── serviceAccountKey.sample.json    # Credentials template
```

---

## 🔒 Concurrency Race Condition Defense

When hundreds of students check out simultaneously during a 15-minute lecture break, `OrderService.checkoutWithAtomicLock` executes an atomic Firestore transaction:

1. **Read Snapshot Phase:** Every item and variant document in the cart is locked and read.
2. **Stock Verification:** Validates `currentStock >= requestedQty` for both base stock and sub-variants.
3. **Pessimistic Abortion:** If any item is depleted, the transaction immediately aborts and throws `InsufficientStockException("Item [Name] just ran out of stock! Available: X")`.
4. **Atomic Decrement:** Balances are decremented and written in the same atomic block.
5. **Token Issuance:** Generates a human-friendly digital token (e.g., `#FETCH-8802`) and dynamic UPI deep-link.

---

## ⚡ Setup & Running

### 1. Configure Firebase Credentials
Place your `serviceAccountKey.json` inside `backend/src/main/resources/`, or set the environment variable:
```bash
export FIREBASE_CREDENTIALS_JSON='{ ...serviceAccountKey JSON... }'
```

### 2. Build & Run
```bash
cd backend
mvn clean spring-boot:run
```
The server starts on port `8080`.

---

## 📡 REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/inventory` | Retrieve live catalog items |
| `POST` | `/api/orders/checkout` | Concurrency-safe atomic order checkout |
| `POST` | `/api/orders/confirm-payment` | Submit student UPI Reference (UTR) |
| `GET` | `/api/orders/{orderId}` | Check order status and token payload |
| `GET` | `/api/admin/orders` | Counter desk live order queue |
| `POST` | `/api/admin/orders/{id}/collect` | Invalidate token and mark collected |
| `POST` | `/api/admin/inventory/{id}/kill-switch?active=false` | Instant Kill-Switch disabling an item |
| `PATCH` | `/api/admin/inventory/{id}` | Update stock balances or prices |
