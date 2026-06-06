# WebSocket Guide (NestJS + Angular)

This project uses **Socket.IO** for real-time communication via the `WebsocketModule` located at `src/core/websocket`.

---

## Backend Setup (Already Configured)

### File Structure

```
src/core/websocket/
├── websocket.gateway.ts   # Handles socket connections/disconnections, raw emit
├── websocket.service.ts   # Injectable wrapper for use in other services
└── websocket.module.ts    # Exports WebsocketService globally
```

### How to Emit Events from Any Service

**Step 1 — Import `WebsocketModule` in your feature module:**
```typescript
@Module({
  imports: [WebsocketModule],
  ...
})
export class DepartmentsModule {}
```

**Step 2 — Inject `WebsocketService` in your service:**
```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly ws: WebsocketService,
) {}
```

**Step 3 — Emit after a mutation:**
```typescript
async update(id: string, dto: UpdateDepartmentDto) {
  const updated = await this.prisma.departments.update({ where: { id }, data: dto });
  this.ws.notifyAll('department_updated'); // broadcast signal to all clients
  return updated;
}
```

### Available WebsocketService Methods

| Method | Description |
|---|---|
| `notifyAll(message)` | Broadcast `notification` event to **all** connected clients |
| `notifyUser(clientId, message)` | Send `notification` event to a **specific** client |

> For custom event names, inject `WebsocketGateway` directly and call `gateway.broadcast(eventName, payload)`.

---

## Frontend Setup (Angular)

### Installation

```bash
npm install socket.io-client
```

### Create a WebSocket Service

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
    this.socket = io(environment.apiUrl, { // point to backend ROOT url, not /api/socket
      path: '/socket',                     // must match backend gateway path
      withCredentials: true,               // required for HttpOnly cookie auth
      transports: ['websocket'],
    });
  }

  on<T>(event: string): Observable<T> {
    return new Observable(observer => {
      this.socket.on(event, (data: T) => observer.next(data));
    });
  }

  emit(event: string, data?: any) {
    this.socket.emit(event, data);
  }

  disconnect() {
    this.socket.disconnect();
  }

  ngOnDestroy() {
    this.socket.disconnect();
  }
}
```

> **Note:** The socket connects automatically when `WebsocketService` is first injected (singleton on app load). Use `autoConnect: false` + `socket.connect()` if you want lazy connection.

---

## Pattern 1: Signal to Re-fetch (Recommended for simplicity)

Backend sends a **signal**, frontend re-fetches via HTTP.

**Backend:**
```typescript
this.ws.notifyAll('department_updated');
```

**Angular Service (with Signals):**
```typescript
@Injectable({ providedIn: 'root' })
export class DepartmentService {
  departments = signal<Department[]>([]);

  constructor(private http: HttpClient, private ws: WebsocketService) {
    this.loadAll();

    this.ws.on('notification').subscribe(() => {
      this.loadAll(); // re-fetch and update signal
    });
  }

  private loadAll() {
    this.http.get<Department[]>('/api/admin/departments').subscribe(data => {
      this.departments.set(data);
    });
  }
}
```

**Angular Component:**
```typescript
@Component({
  template: `
    @for (dept of deptService.departments(); track dept.id) {
      <div>{{ dept.name }}</div>
    }
  `
})
export class DepartmentsComponent {
  deptService = inject(DepartmentService);
  // ✅ No manual subscription needed — signal handles reactivity
}
```

---

## Pattern 2: Push Data Directly (More efficient)

Backend sends the **updated object**, frontend updates local state without re-fetching.

**Backend:**
```typescript
const updated = await this.prisma.departments.update(...);
this.gateway.broadcast('department_updated', updated); // send the actual data
```

**Angular Service:**
```typescript
this.ws.on<Department>('department_updated').subscribe(updated => {
  this.departments.update(list =>
    list.map(d => d.id === updated.id ? updated : d)
  );
});
```

---

## Connection Flow

```
App loads → Angular creates WebsocketService (singleton)
         → io() connects to backend
         → Backend logs: "Client connected: <socketId>"

Backend mutation occurs
  → ws.notifyAll('event_name')
    → All connected Angular clients receive event
      → Observable emits
        → Signal updates
          → Template re-renders ✨
```

---

## Tips

- Use **Pattern 1** (re-fetch) for admin dashboards and low-frequency changes — simpler and safer.
- Use **Pattern 2** (push data) for high-frequency updates where extra HTTP calls are a concern.
- Always call `socket.disconnect()` on logout to free the connection.
- `environment.apiUrl` should be your backend root URL, e.g. `https://app.formstructure.design` — **not** `https://app.formstructure.design/api`.

---

# WSS Nginx settings
Here’s a clean, production-style example using Nginx to handle HTTPS + WebSockets for your NestJS app.

---

# ✅ 1. Basic Nginx config (HTTP → WS proxy)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";

        # Forward headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

👉 This works for:

* `ws://your-domain.com`
* NestJS running on port `3000`

---

# 🔐 2. HTTPS + WSS (recommended setup)

After setting up SSL via Certbot:

```nginx
# Redirect HTTP → HTTPS
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;

        # Required for WebSockets
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";

        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

---

# 🧠 What this gives you

* Frontend connects to:

  ```
  wss://your-domain.com
  ```
* Nginx handles SSL
* Your NestJS app still runs on:

  ```
  http://localhost:3000
  ```

---

# ⚠️ Common mistakes

* ❌ Missing `Upgrade` headers → WebSocket won’t connect
* ❌ Using `ws://` on HTTPS site → browser blocks it
* ❌ Forgetting `proxy_http_version 1.1`
* ❌ Firewall blocking port 443

---

# 🧩 If you use a namespace (e.g. `/chat`)

No extra config needed — Nginx forwards everything:

```
wss://your-domain.com/chat
```

---

# 🚀 Bonus: Separate API + WS path

If you want cleaner routing:

```nginx
location /api/ {
    proxy_pass http://localhost:3000;
}

location /socket/ {
    proxy_pass http://localhost:3000;

    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "Upgrade";
}
```

Then connect to:

```
wss://your-domain.com/socket
```

---

If you want, tell me:

* your domain
* whether you're using Socket.IO or native WS

I can tailor this config exactly to your setup 👍
