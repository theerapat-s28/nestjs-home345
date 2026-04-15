# Payment Methods API Reference

Base URL: `/api`

All endpoints require a valid JWT bearer token.

---

## Overview

Payment methods represent the user's stored payment instruments (credit cards, debit cards, PayPal, etc.). Each user can have multiple payment methods, and they can be linked to subscriptions.

---

## Enums

### `PaymentType`

| Value           | Description             |
| --------------- | ----------------------- |
| `CREDIT_CARD`   | Credit card             |
| `DEBIT_CARD`    | Debit card              |
| `PAYPAL`        | PayPal account          |
| `BANK_TRANSFER` | Direct bank transfer    |
| `CRYPTO`        | Cryptocurrency wallet   |

---

## 1. Add a Payment Method

### `POST /api/payment-methods`

Creates a new payment method for the authenticated user.

**Request body:**

```json
{
  "type": "CREDIT_CARD",
  "provider": "VISA",
  "last4": "1234",
  "name": "My main card"
}
```

| Field      | Type          | Required | Description                              |
| ---------- | ------------- | -------- | ---------------------------------------- |
| `type`     | `PaymentType` | Yes      | One of the `PaymentType` values above    |
| `provider` | string        | No       | Card network / provider (VISA, Mastercard, etc.) |
| `last4`    | string        | No       | Last 4 digits — **never send full card numbers** |
| `name`     | string        | No       | User-friendly label for the method       |

**Response:**

```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "type": "CREDIT_CARD",
  "provider": "VISA",
  "last4": "1234",
  "name": "My main card",
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z",
  "deletedAt": null
}
```

---

## 2. Get All Payment Methods

### `GET /api/payment-methods`

Returns all active (non-deleted) payment methods for the authenticated user.

**Response:**

```json
[
  {
    "id": "uuid",
    "userId": "user-uuid",
    "type": "CREDIT_CARD",
    "provider": "VISA",
    "last4": "1234",
    "name": "My main card",
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T10:00:00.000Z",
    "deletedAt": null
  },
  {
    "id": "uuid-2",
    "userId": "user-uuid",
    "type": "PAYPAL",
    "provider": null,
    "last4": null,
    "name": "PayPal personal",
    "createdAt": "2026-04-02T08:00:00.000Z",
    "updatedAt": "2026-04-02T08:00:00.000Z",
    "deletedAt": null
  }
]
```

> Only payment methods where `deletedAt` is `null` are returned.

---

## 3. Get a Single Payment Method

### `GET /api/payment-methods/:id`

Returns a single payment method by UUID, including its linked subscriptions.

**Path parameter:**

| Param | Type | Description          |
| ----- | ---- | -------------------- |
| `id`  | UUID | Payment method UUID  |

**Response:**

```json
{
  "id": "uuid",
  "userId": "user-uuid",
  "type": "CREDIT_CARD",
  "provider": "VISA",
  "last4": "1234",
  "name": "My main card",
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z",
  "deletedAt": null,
  "subscriptions": [
    {
      "id": "sub-uuid",
      "name": "Netflix",
      "amount": "15.99",
      "currency": "USD",
      "billingCycle": "MONTHLY",
      "nextBillingDate": "2026-05-01T00:00:00.000Z",
      "isActive": true
    }
  ]
}
```

**Error — 404:**

```json
{ "message": "Payment method with ID <id> not found" }
```

---

## 4. Update a Payment Method

### `PATCH /api/payment-methods/:id`

Updates fields on an existing payment method. All fields are optional (partial update).

**Path parameter:**

| Param | Type | Description         |
| ----- | ---- | ------------------- |
| `id`  | UUID | Payment method UUID |

**Request body (all optional):**

```json
{
  "type": "DEBIT_CARD",
  "provider": "Mastercard",
  "last4": "5678",
  "name": "Debit card"
}
```

**Response:** The updated payment method object.

**Error — 404:** Payment method not found or does not belong to the user.

---

## 5. Delete a Payment Method (Soft Delete)

### `DELETE /api/payment-methods/:id`

Soft-deletes a payment method by setting `deletedAt`. The record is retained in the database but excluded from all queries.

**Path parameter:**

| Param | Type | Description         |
| ----- | ---- | ------------------- |
| `id`  | UUID | Payment method UUID |

No request body required.

**Response:** The soft-deleted payment method object (with `deletedAt` set).

**Error — 404:** Payment method not found or does not belong to the user.

---

## Error Handling

All errors follow the global error shape:

```json
{
  "httpCode": 404,
  "message": "Payment method with ID <id> not found",
  "timestamp": "2026-04-01T10:00:00.000Z",
  "path": "/api/payment-methods/<id>"
}
```

| HTTP Status | Cause                                       |
| ----------- | ------------------------------------------- |
| 400         | Invalid body (validation failed)            |
| 401         | Missing or expired JWT token                |
| 404         | Payment method not found or not owned by user |
| 409         | Duplicate unique constraint                 |
