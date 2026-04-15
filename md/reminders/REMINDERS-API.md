# Reminders API Reference

Base URL: `/api`

All endpoints require a valid JWT bearer token.

---

## Overview

Reminders are rules attached to a subscription that define when and how the user should be notified before a billing date. For example, "remind me 3 days before via email." Each reminder is tied to exactly one subscription and the user must own that subscription.

---

## Enums

### `NotificationChannel`

| Value   | Description            |
| ------- | ---------------------- |
| `EMAIL` | Email notification     |
| `PUSH`  | Push notification      |
| `SMS`   | SMS text message       |

---

## Unique Constraint

A subscription can have at most **one** reminder rule per (`daysBefore` + `channel`) combination. Attempting to create a duplicate will return a `409 Conflict` error.

For example, a subscription **can** have:
- 3 days before via `EMAIL`
- 3 days before via `PUSH`
- 1 day before via `EMAIL`

But **cannot** have two reminders for "3 days before via EMAIL" on the same subscription.

---

## 1. Create a Reminder

### `POST /api/reminders`

Creates a new reminder rule for a subscription owned by the authenticated user.

**Request body:**

```json
{
  "subscriptionId": "sub-uuid",
  "daysBefore": 3,
  "channel": "EMAIL"
}
```

| Field            | Type                  | Required | Description                                        |
| ---------------- | --------------------- | -------- | -------------------------------------------------- |
| `subscriptionId` | UUID                  | Yes      | The subscription to attach this reminder to        |
| `daysBefore`     | integer (≥ 0)         | Yes      | Days before `nextBillingDate` to send the reminder |
| `channel`        | `NotificationChannel` | Yes      | Delivery channel for the reminder                  |

> `daysBefore = 0` means "remind on the billing day itself."

**Response:**

```json
{
  "id": "reminder-uuid",
  "subscriptionId": "sub-uuid",
  "daysBefore": 3,
  "channel": "EMAIL",
  "isSent": false,
  "sentAt": null,
  "createdAt": "2026-04-01T10:00:00.000Z"
}
```

**Errors:**

| HTTP Status | Cause                                                      |
| ----------- | ---------------------------------------------------------- |
| 404         | Subscription not found or does not belong to the user      |
| 409         | Duplicate `(subscriptionId, daysBefore, channel)` combo    |

---

## 2. Get All Reminders

### `GET /api/reminders`

Returns all reminders for subscriptions owned by the authenticated user. Each reminder includes its parent subscription.

**Response:**

```json
[
  {
    "id": "reminder-uuid",
    "subscriptionId": "sub-uuid",
    "daysBefore": 3,
    "channel": "EMAIL",
    "isSent": false,
    "sentAt": null,
    "createdAt": "2026-04-01T10:00:00.000Z",
    "subscription": {
      "id": "sub-uuid",
      "name": "Netflix",
      "amount": "15.99",
      "currency": "USD",
      "billingCycle": "MONTHLY",
      "nextBillingDate": "2026-05-01T00:00:00.000Z",
      "isActive": true
    }
  }
]
```

> Only reminders for non-deleted subscriptions are returned.

---

## 3. Get a Single Reminder

### `GET /api/reminders/:id`

Returns a single reminder by UUID, including its parent subscription.

**Path parameter:**

| Param | Type | Description     |
| ----- | ---- | --------------- |
| `id`  | UUID | Reminder UUID   |

**Response:**

```json
{
  "id": "reminder-uuid",
  "subscriptionId": "sub-uuid",
  "daysBefore": 3,
  "channel": "EMAIL",
  "isSent": false,
  "sentAt": null,
  "createdAt": "2026-04-01T10:00:00.000Z",
  "subscription": {
    "id": "sub-uuid",
    "name": "Netflix",
    "amount": "15.99",
    "currency": "USD",
    "billingCycle": "MONTHLY",
    "nextBillingDate": "2026-05-01T00:00:00.000Z",
    "isActive": true
  }
}
```

**Error — 404:**

```json
{ "message": "Reminder <id> not found" }
```

---

## 4. Update a Reminder

### `PATCH /api/reminders/:id`

Updates fields on an existing reminder. Only `daysBefore` and `channel` can be updated — `subscriptionId` cannot be changed after creation.

**Path parameter:**

| Param | Type | Description    |
| ----- | ---- | -------------- |
| `id`  | UUID | Reminder UUID  |

**Request body (all optional):**

```json
{
  "daysBefore": 7,
  "channel": "PUSH"
}
```

| Field        | Type                  | Description                                 |
| ------------ | --------------------- | ------------------------------------------- |
| `daysBefore` | integer (≥ 0)         | New days-before value                       |
| `channel`    | `NotificationChannel` | New delivery channel                        |

> **Note:** `subscriptionId` is intentionally excluded from updates. To move a reminder to a different subscription, delete it and create a new one.

**Response:** The updated reminder object.

**Error — 404:** Reminder not found or its subscription does not belong to the user.

---

## 5. Delete a Reminder (Hard Delete)

### `DELETE /api/reminders/:id`

Permanently deletes a reminder rule. Unlike subscriptions and payment methods, reminders use **hard delete** — the record is removed from the database entirely.

**Path parameter:**

| Param | Type | Description    |
| ----- | ---- | -------------- |
| `id`  | UUID | Reminder UUID  |

No request body required.

**Response:** The deleted reminder object.

**Error — 404:** Reminder not found or its subscription does not belong to the user.

---

## Delivery Tracking Fields

These fields are managed by the backend reminder job and are **read-only** from the frontend perspective:

| Field    | Type     | Description                                |
| -------- | -------- | ------------------------------------------ |
| `isSent` | boolean  | `true` once the reminder has been delivered |
| `sentAt` | datetime | Timestamp of actual delivery (`null` until sent) |

> Use `isSent` to show a "sent" badge or status indicator in the UI.

---

## Relationships

```
Subscription (parent)
 └── Reminder (many)
       ├── daysBefore: when to notify
       └── channel: how to notify
```

- A reminder always belongs to a subscription via `subscriptionId`.
- Deleting a subscription cascades and removes all its reminders.
- Ownership is verified through the parent subscription — the user must own the subscription to manage its reminders.

---

## Error Handling

All errors follow the global error shape:

```json
{
  "httpCode": 404,
  "message": "Reminder <id> not found",
  "timestamp": "2026-04-01T10:00:00.000Z",
  "path": "/api/reminders/<id>"
}
```

| HTTP Status | Cause                                                   |
| ----------- | ------------------------------------------------------- |
| 400         | Invalid body (validation failed)                        |
| 401         | Missing or expired JWT token                            |
| 404         | Reminder or parent subscription not found / not owned   |
| 409         | Duplicate `(subscriptionId, daysBefore, channel)` rule  |
