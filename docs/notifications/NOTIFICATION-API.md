# Notification API Reference

Base URL: `/api`

All endpoints require a valid JWT bearer token.

---

## Overview

Notifications are created by the backend and delivered to users two ways:

1. **REST API** — fetch, mark as read, delete
2. **WebSocket (real-time)** — server pushes the `notification` event to every recipient immediately after creation

---

## Notification Types (`NotificationType`)

| Value      | Description                                        |
| ---------- | -------------------------------------------------- |
| `info`     | General news or announcements                      |
| `task`     | Task assignments and task-related updates          |
| `event`    | Calendar event invitations / updates               |
| `approval` | Approval requests (e.g. content, access)           |
| `system`   | System-generated messages (maintenance, auto-jobs) |

---

## 1. Get My Notifications

### `GET /api/notifications/my`

Returns a paginated list of notifications for the authenticated user.

**Query parameters (all optional):**

| Param    | Type    | Example | Description                            |
| -------- | ------- | ------- | -------------------------------------- |
| `type`   | string  | `task`  | Filter by notification type            |
| `isRead` | boolean | `false` | Filter by read status (`true`/`false`) |
| `limit`  | integer | `10`    | Page size (default: 10)                |
| `offset` | integer | `0`     | Records to skip (default: 0)           |

**Examples:**

```
GET /api/notifications/my
GET /api/notifications/my?isRead=false
GET /api/notifications/my?type=task&isRead=false
GET /api/notifications/my?limit=20&offset=20
```

**Response:**

```json
{
  "items": [
    {
      "id": "recipient-uuid",
      "userId": "user-uuid",
      "notificationId": "notification-uuid",
      "isRead": false,
      "readAt": null,
      "createdAt": "2026-03-27T10:00:00.000Z",
      "notification": {
        "id": "notification-uuid",
        "title": "New item shared with you",
        "message": "Alice shared an item with you.",
        "type": "info",
        "data": { "itemId": "item-uuid", "link": "/items/item-uuid" },
        "senderId": "user-uuid",
        "createdAt": "2026-03-27T10:00:00.000Z",
        "updatedAt": "2026-03-27T10:00:00.000Z",
        "sender": {
          "id": "user-uuid",
          "username": "alice",
          "profile": {
            "profileImageUrl": "https://example.com/avatar.jpg"
          }
        }
      }
    }
  ],
  "total": 25
}
```

---

## 2. Get Unread Count

### `GET /api/notifications/unread-count`

Returns the total number of unread notifications for the authenticated user.

**Response:**

```json
{ "count": 5 }
```

> Use this to drive a badge on the notification bell icon.

---

## 3. Mark a Notification as Read

### `PATCH /api/notifications/:id/read`

Marks a specific notification as read. `:id` can be either the `NotificationRecipient.id` or the `Notification.id`.

No request body required.

**Response:**

```json
{
  "id": "recipient-uuid",
  "userId": "user-uuid",
  "notificationId": "notification-uuid",
  "isRead": true,
  "readAt": "2026-03-27T10:05:00.000Z",
  "createdAt": "2026-03-27T10:00:00.000Z"
}
```

---

## 4. Mark All Notifications as Read

### `PATCH /api/notifications/read-all`

Marks every unread notification as read for the authenticated user.

No request body required.

**Response:**

```json
{ "count": 5 }
```

> `count` is the number of notifications updated.

---

## 5. Delete a Notification

### `DELETE /api/notifications/:id`

Removes a notification from the user's feed. `:id` can be either the `NotificationRecipient.id` or the `Notification.id`.

No request body required.

**Response:** The deleted `NotificationRecipient` record.

---

## 6. Create a Notification (backend / admin)

### `POST /api/notifications`

Sends a notification to one or more users. Typically called by other backend services, not directly by the frontend.

**Request body:**

```json
{
  "title": "New item shared with you",
  "message": "Alice shared an item with you.",
  "type": "info",
  "data": { "itemId": "item-uuid", "link": "/items/item-uuid" },
  "senderId": "user-uuid-of-sender",
  "recipientIds": ["user-uuid-1", "user-uuid-2"]
}
```

| Field          | Type   | Required | Description                                    |
| -------------- | ------ | -------- | ---------------------------------------------- |
| `title`        | string | Yes      | Notification title                             |
| `message`      | string | Yes      | Notification body text                         |
| `type`         | string | Yes      | One of the `NotificationType` values above     |
| `data`         | object | No       | Arbitrary JSON payload (deep-link, entity IDs) |
| `senderId`     | UUID   | No       | Sender user ID (`null` = system message)       |
| `recipientIds` | UUID[] | Yes      | User IDs who should receive this notification  |

**Response:** Created notification with all recipients.

---

## 7. Real-Time Delivery (WebSocket)

When a notification is created the server immediately pushes the `notification` event to every recipient's user room (all their connected tabs/devices).

**Event name:** `notification`

**Payload:**

```json
{
  "id": "notification-uuid",
  "senderId": "user-uuid",
  "sender": {
    "id": "user-uuid",
    "username": "alice",
    "profileImageUrl": "https://example.com/avatar.jpg"
  },
  "title": "New item shared with you",
  "message": "Alice shared an item with you.",
  "type": "info",
  "data": { "itemId": "item-uuid", "link": "/items/item-uuid" },
  "createdAt": "2026-03-27T10:00:00.000Z"
}
```

**Recommended frontend handling:**

1. Listen for the `notification` WebSocket event.
2. Append to the local notification list (or show a toast).
3. Increment the unread badge count by 1.
4. On click: call `PATCH /api/notifications/:id/read` and navigate using `data.link`.

---

## `data` Payload Conventions by Type

The `data` field is a free-form JSON object. Suggested conventions:

| Type       | Suggested `data` fields                                       |
| ---------- | ------------------------------------------------------------- |
| `info`     | `{ "link": "/announcements/uuid" }`                           |
| `task`     | `{ "taskId": "uuid", "link": "/tasks/uuid" }`                 |
| `event`    | `{ "eventId": "uuid", "link": "/events/uuid" }`               |
| `approval` | `{ "entityType": "...", "entityId": "uuid", "link": "/..." }` |
| `system`   | `{ "action": "maintenance", "scheduledAt": "..." }`           |

Add your own conventions here as new feature modules are introduced.

---

## Pagination Pattern

All list endpoints use offset-based pagination:

| Query param | Default | Description    |
| ----------- | ------- | -------------- |
| `limit`     | `10`    | Items per page |
| `offset`    | `0`     | Items to skip  |

Page 3 with 10 items: `?limit=10&offset=20`
