# Subscriptions API Reference

Base URL: `/api`

All endpoints require a valid JWT bearer token.

---

## Overview

Subscriptions track recurring services (Netflix, Spotify, AWS, etc.) with billing information. Each subscription belongs to a user, can be linked to a payment method, and can have one or more reminder rules attached.

---

## Enums

### `BillingCycle`

| Value     | Description          |
| --------- | -------------------- |
| `DAILY`   | Billed every day     |
| `WEEKLY`  | Billed every week    |
| `MONTHLY` | Billed every month   |
| `YEARLY`  | Billed every year    |

### `Currency`

| Value | Description    |
| ----- | -------------- |
| `USD` | US Dollar      |
| `EUR` | Euro           |
| `THB` | Thai Baht      |

---

## 1. Create a Subscription

### `POST /api/subscriptions`

Creates a new subscription for the authenticated user.

**Request body:**

```json
{
  "name": "Netflix",
  "description": "Standard plan",
  "amount": 15.99,
  "currency": "USD",
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2026-05-01T00:00:00Z",
  "paymentMethodId": "payment-method-uuid"
}
```

| Field             | Type           | Required | Description                                |
| ----------------- | -------------- | -------- | ------------------------------------------ |
| `name`            | string         | Yes      | Service name (must be unique per user)     |
| `description`     | string         | No       | Optional note or plan name                 |
| `amount`          | number         | Yes      | Billing amount (e.g. `15.99`)              |
| `currency`        | `Currency`     | Yes      | One of the `Currency` enum values          |
| `billingCycle`    | `BillingCycle` | Yes      | One of the `BillingCycle` enum values      |
| `nextBillingDate` | ISO 8601 date  | Yes      | Next billing date — source of truth for reminders |
| `paymentMethodId` | UUID           | No       | Link to an existing payment method         |

**Response:**

```json
{
  "id": "sub-uuid",
  "userId": "user-uuid",
  "name": "Netflix",
  "description": "Standard plan",
  "amount": "15.99",
  "currency": "USD",
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2026-05-01T00:00:00.000Z",
  "paymentMethodId": "payment-method-uuid",
  "isActive": true,
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z",
  "deletedAt": null
}
```

> **Note:** `amount` is returned as a string (Decimal type) to avoid floating-point rounding errors.

---

## 2. Get All Subscriptions

### `GET /api/subscriptions`

Returns all active (non-deleted) subscriptions for the authenticated user, ordered by `nextBillingDate` ascending (soonest first). Each subscription includes its linked payment method.

**Response:**

```json
[
  {
    "id": "sub-uuid",
    "userId": "user-uuid",
    "name": "Netflix",
    "description": "Standard plan",
    "amount": "15.99",
    "currency": "USD",
    "billingCycle": "MONTHLY",
    "nextBillingDate": "2026-05-01T00:00:00.000Z",
    "paymentMethodId": "payment-method-uuid",
    "isActive": true,
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T10:00:00.000Z",
    "deletedAt": null,
    "paymentMethod": {
      "id": "payment-method-uuid",
      "type": "CREDIT_CARD",
      "provider": "VISA",
      "last4": "1234",
      "name": "My main card"
    }
  }
]
```

> Results are sorted by `nextBillingDate` ascending — upcoming bills appear first. Only subscriptions where `deletedAt` is `null` are returned.

---

## 3. Get a Single Subscription

### `GET /api/subscriptions/:id`

Returns a single subscription by UUID, including its payment method and all reminder rules.

**Path parameter:**

| Param | Type | Description        |
| ----- | ---- | ------------------ |
| `id`  | UUID | Subscription UUID  |

**Response:**

```json
{
  "id": "sub-uuid",
  "userId": "user-uuid",
  "name": "Netflix",
  "description": "Standard plan",
  "amount": "15.99",
  "currency": "USD",
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2026-05-01T00:00:00.000Z",
  "paymentMethodId": "payment-method-uuid",
  "isActive": true,
  "createdAt": "2026-04-01T10:00:00.000Z",
  "updatedAt": "2026-04-01T10:00:00.000Z",
  "deletedAt": null,
  "paymentMethod": {
    "id": "payment-method-uuid",
    "type": "CREDIT_CARD",
    "provider": "VISA",
    "last4": "1234",
    "name": "My main card"
  },
  "reminders": [
    {
      "id": "reminder-uuid",
      "subscriptionId": "sub-uuid",
      "daysBefore": 3,
      "channel": "EMAIL",
      "isSent": false,
      "sentAt": null,
      "createdAt": "2026-04-01T10:00:00.000Z"
    }
  ]
}
```

**Error — 404:**

```json
{ "message": "Subscription with ID <id> not found" }
```

---

## 4. Update a Subscription

### `PATCH /api/subscriptions/:id`

Updates fields on an existing subscription. All fields are optional (partial update). Additionally supports setting `isActive` to pause/resume a subscription.

**Path parameter:**

| Param | Type | Description       |
| ----- | ---- | ----------------- |
| `id`  | UUID | Subscription UUID |

**Request body (all optional):**

```json
{
  "name": "Netflix Premium",
  "amount": 22.99,
  "billingCycle": "MONTHLY",
  "nextBillingDate": "2026-06-01T00:00:00Z",
  "paymentMethodId": "new-payment-method-uuid",
  "isActive": false
}
```

| Field      | Type    | Description                                    |
| ---------- | ------- | ---------------------------------------------- |
| `isActive` | boolean | Set `false` to pause, `true` to resume         |
| _(others)_ | —       | Same fields as create — all optional            |

**Response:** The updated subscription object.

**Error — 404:** Subscription not found or does not belong to the user.

---

## 5. Delete a Subscription (Soft Delete)

### `DELETE /api/subscriptions/:id`

Soft-deletes a subscription by setting `deletedAt` and `isActive = false`. The record is retained in the database but excluded from all queries.

**Path parameter:**

| Param | Type | Description       |
| ----- | ---- | ----------------- |
| `id`  | UUID | Subscription UUID |

No request body required.

**Response:** The soft-deleted subscription object (with `deletedAt` set and `isActive` = `false`).

**Error — 404:** Subscription not found or does not belong to the user.

---

## Relationships

```
User
 └── Subscription (many)
       ├── PaymentMethod? (optional link)
       └── Reminder[] (one-to-many)
```

- A subscription can optionally be linked to a payment method via `paymentMethodId`.
- A subscription can have multiple reminder rules (see [Reminders API](../reminders/REMINDERS-API.md)).
- Deleting a subscription cascades to all its reminders.

---

## Error Handling

All errors follow the global error shape:

```json
{
  "httpCode": 404,
  "message": "Subscription with ID <id> not found",
  "timestamp": "2026-04-01T10:00:00.000Z",
  "path": "/api/subscriptions/<id>"
}
```

| HTTP Status | Cause                                          |
| ----------- | ---------------------------------------------- |
| 400         | Invalid body (validation failed)               |
| 401         | Missing or expired JWT token                   |
| 404         | Subscription not found or not owned by user    |
| 409         | Duplicate subscription name (unique constraint)|
