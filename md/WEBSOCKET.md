# WebSocket Integration Guide (Angular)

This project uses **Socket.IO** for real-time communication. The backend gateway lives at `src/core/websocket/`.

Base URL: same as your API — e.g. `https://your-backend.com`
Socket path: `/socket`

---

## 1. Prerequisites

- User must be **authenticated** (a valid `access_token` HttpOnly cookie must exist before the socket connects).
- Install the Socket.IO client:

```bash
pnpm add socket.io-client
```

---

## 2. Create the Angular WebSocket Service

```typescript
// src/app/core/services/websocket.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';

@Injectable({ providedIn: 'root' })
export class WebsocketService implements OnDestroy {
  private socket: Socket;

  constructor() {
    this.socket = io(environment.apiUrl, {
      // ↑ point to the backend ROOT url — NOT the /api prefix
      // e.g.  'https://your-backend.com'  ✅
      //        'https://your-backend.com/api'  ❌
      path: '/socket',           // must match backend gateway path
      withCredentials: true,     // sends the HttpOnly access_token cookie automatically
      transports: ['websocket'],
    });
  }

  /** Subscribe to a named event from the server. */
  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => observer.next(data));
    });
  }

  /** Emit an event to the server. */
  emit(event: string, data?: unknown) {
    this.socket.emit(event, data);
  }

  /** Manually disconnect (call on logout). */
  disconnect() {
    this.socket.disconnect();
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }
}
```

> The socket connects automatically when `WebsocketService` is first injected (Angular singleton on app load).
> Call `disconnect()` on logout to free the connection.

---

## 3. Authentication

Authentication is **fully automatic** — no extra step is needed from the frontend.

### How it works

1. The browser sends the `access_token` HttpOnly cookie on the initial handshake (`withCredentials: true`).
2. The backend validates the JWT; if valid, the socket is accepted.
3. Each authenticated socket is **auto-joined to a room named after the user's UUID**. This is how per-user events are delivered to all of the user's tabs/devices at once.
4. If the token is missing or invalid, the socket is **immediately disconnected**.

### Token source — priority order (backend)

| Priority | Source | How it works |
|----------|--------|-------------|
| 1 | `access_token` cookie | Sent automatically by the browser |
| 2 | `Authorization: Bearer <token>` header | Passed via `auth` handshake option |
| 3 | `?token=<jwt>` query param | Useful for testing/debugging only |

### Passing the token via header (alternative to cookie)

```typescript
this.socket = io(environment.apiUrl, {
  path: '/socket',
  withCredentials: true,
  transports: ['websocket'],
  auth: {
    token: `Bearer ${yourAccessToken}`, // fallback if cookie is not available
  },
});
```

### Dev bypass mode

When the backend runs with `BYPASS_AUTH=true` (development only), all connections are accepted without a token.

---

## 4. Events Reference

These are the **actual WebSocket events** emitted by this backend that the frontend should listen for:

### `notification`

Fired when a new notification is created for the authenticated user. Only that user receives it (per-user room delivery).

**Payload:**

```typescript
interface NotificationPayload {
  id: string;               // Notification UUID
  senderId: string | null;  // Sender user UUID (null = system)
  sender: {
    id: string;
    username: string;
    profileImageUrl: string | null;
  } | null;
  title: string;
  message: string | null;
  type: 'INFO' | 'TASK' | 'EVENT' | 'APPROVAL' | 'SYSTEM';
  data: Record<string, unknown> | null; // Deep-link payload — see Notification API docs
  createdAt: string;        // ISO 8601 timestamp
}
```

**Example payload:**

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
  "type": "INFO",
  "data": { "itemId": "item-uuid", "link": "/items/item-uuid" },
  "createdAt": "2026-04-15T10:00:00.000Z"
}
```

---

## 5. Usage Patterns

### Pattern 1 — Signal to Re-fetch (recommended for simplicity)

Backend emits a lightweight signal; frontend re-fetches fresh data via HTTP.

**Best for:** Low-frequency updates, admin dashboards, shared data.

```typescript
@Injectable({ providedIn: 'root' })
export class NotificationService {
  notifications = signal<Notification[]>([]);
  unreadCount = signal<number>(0);

  constructor(private http: HttpClient, private ws: WebsocketService) {
    this.loadAll();

    // Re-fetch list whenever a new notification arrives
    this.ws.on('notification').subscribe(() => {
      this.loadAll();
      this.loadUnreadCount();
    });
  }

  private loadAll() {
    this.http.get<{ items: Notification[]; total: number }>('/api/notifications/my')
      .subscribe(({ items }) => this.notifications.set(items));
  }

  private loadUnreadCount() {
    this.http.get<{ count: number }>('/api/notifications/unread-count')
      .subscribe(({ count }) => this.unreadCount.set(count));
  }
}
```

```typescript
@Component({
  template: `
    <span class="badge">{{ notifService.unreadCount() }}</span>

    @for (n of notifService.notifications(); track n.id) {
      <div>{{ n.notification.title }}</div>
    }
  `
})
export class NotificationBellComponent {
  notifService = inject(NotificationService);
  // ✅ No manual subscriptions — signals handle reactivity
}
```

---

### Pattern 2 — Push Data Directly (more efficient)

Backend sends the full payload; frontend updates local state without an extra HTTP call.

**Best for:** High-frequency updates, real-time feeds, chat-like UX.

```typescript
@Injectable({ providedIn: 'root' })
export class NotificationService {
  notifications = signal<NotificationPayload[]>([]);
  unreadCount = signal<number>(0);

  constructor(private ws: WebsocketService) {
    // Prepend new notification to local list and increment badge
    this.ws.on<NotificationPayload>('notification').subscribe(payload => {
      this.notifications.update(list => [payload, ...list]);
      this.unreadCount.update(n => n + 1);
    });
  }
}
```

---

## 6. Recommended Notification Flow

```
User logs in → access_token cookie set
             → Angular app initialises WebsocketService
             → Socket connects to backend with cookie
             → Backend validates JWT → socket joins room: <userId>

Backend creates notification for userId
  → wsService.sendToUser(userId, 'notification', payload)
    → All connected tabs/devices of that user receive the event
      → Observable emits
        → Signal updates
          → Badge increments / list prepends ✨

User clicks notification
  → PATCH /api/notifications/:id/read
  → Navigate to data.link
```

---

## 7. Lifecycle Management

### Connect after login

By default the socket connects on service creation (app load). If you want to connect only after login:

```typescript
this.socket = io(environment.apiUrl, {
  path: '/socket',
  withCredentials: true,
  transports: ['websocket'],
  autoConnect: false,  // don't connect immediately
});

// Then in your auth service, after login:
this.socket.connect();
```

### Disconnect on logout

Always disconnect when the user logs out to free the server-side socket and clear the user room:

```typescript
// auth.service.ts
logout() {
  this.wsService.disconnect();
  // ... clear cookies, redirect to login
}
```

### Subscription cleanup

When using `ws.on()` inside a component (not a service), always unsubscribe:

```typescript
export class MyComponent implements OnDestroy {
  private sub = this.ws.on('notification').subscribe(/* ... */);

  ngOnDestroy() {
    this.sub.unsubscribe();
  }
}
```

> If you use `ws.on()` inside a root-level service (singleton), no cleanup is needed.

---

## 8. environment.ts

```typescript
export const environment = {
  apiUrl: 'https://your-backend.com',  // backend ROOT — no /api suffix
  // ...
};
```

---

## 9. Common Mistakes

| ❌ Mistake | ✅ Fix |
|-----------|--------|
| `apiUrl: 'https://backend.com/api'` | `apiUrl: 'https://backend.com'` — no `/api` suffix |
| Connecting before login | Use `autoConnect: false` + `socket.connect()` after login |
| Not calling `disconnect()` on logout | Always disconnect — the user room stays alive otherwise |
| Listening for signals in a component without unsubscribing | Use `takeUntilDestroyed()` or store the `Subscription` and call `.unsubscribe()` |
| Using `ws://` on an HTTPS site | Use `wss://` — browsers block mixed content |
| Forgetting `withCredentials: true` | Required for the HttpOnly cookie to be sent on handshake |
