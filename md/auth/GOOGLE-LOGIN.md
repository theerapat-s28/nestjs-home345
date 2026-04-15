# Google Login - Frontend Integration Guide

## Overview

This backend uses Google OAuth 2.0 with HttpOnly cookie-based authentication. The login flow is a **server-side redirect flow** -- the frontend does NOT use the Google Sign-In SDK directly. Instead, the frontend redirects the user to the backend, which handles the entire OAuth exchange with Google and sets an HttpOnly cookie on success.

## Prerequisites

- Backend is running and configured with `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BACKEND_URL`, and `FRONTEND_URL` environment variables.
- `FRONTEND_URL` must match the origin where the frontend is hosted (e.g., `http://localhost:4200`).
- All API requests that need to send/receive the auth cookie must include `credentials: "include"` (fetch) or `withCredentials: true` (axios).

---

## Login Flow (Step by Step)

```
Frontend                        Backend                         Google
   |                               |                               |
   |  1. redirect/navigate to      |                               |
   |   GET /api/auth/google        |                               |
   |------------------------------>|                               |
   |                               |  2. redirect to Google        |
   |                               |   consent screen              |
   |                               |------------------------------>|
   |                               |                               |
   |                               |  3. user grants consent       |
   |                               |<------------------------------|
   |                               |                               |
   |                               |  4. exchange code for token,  |
   |                               |     find/create user,         |
   |                               |     generate JWT,             |
   |                               |     set HttpOnly cookie       |
   |                               |                               |
   |  5. redirect to               |                               |
   |   {FRONTEND_URL}/auth/google/callback                         |
   |<------------------------------|                               |
   |                               |                               |
   |  6. GET /api/auth/verify-token|                               |
   |   (cookie sent automatically) |                               |
   |------------------------------>|                               |
   |                               |                               |
   |  7. return user data + token  |                               |
   |<------------------------------|                               |
```

---

## Step 1: Initiate Google Login

Redirect the user to the backend's Google auth endpoint. This is a **full page redirect**, not an API call.

```typescript
// Redirect the browser to backend Google OAuth endpoint
window.location.href = `${BACKEND_URL}/api/auth/google`;
```

Or as an anchor link:

```html
<a href="http://localhost:3000/api/auth/google">Login with Google</a>
```

**What happens:** The backend redirects the user to Google's consent screen. After the user grants permission, Google redirects back to the backend at `/api/auth/google/callback`. The backend then:

1. Creates a new user if the email doesn't exist (with `status: pending`)
2. Generates a JWT and sets it as an HttpOnly cookie named `access_token`
3. Redirects the browser to `{FRONTEND_URL}/auth/google/callback`

---

## Step 2: Handle the Callback Page

Create a page/route at `/auth/google/callback` in your frontend app. This page will:

1. Check for error query parameters
2. Call the verify-token endpoint to get user data
3. Store user info in your app state and redirect to the main page

### Check for Errors

The backend appends `?error=pending_approval` to the redirect URL if the user account is pending admin approval.

```typescript
// /auth/google/callback page

const urlParams = new URLSearchParams(window.location.search);
const error = urlParams.get("error");

if (error === "pending_approval") {
  // Show message: "Your account is pending admin approval."
  // Redirect to login page or show a notice
  return;
}
```

### Verify Token and Get User Data

Since the JWT is in an HttpOnly cookie (not readable by JavaScript), call the `verify-token` endpoint to validate the cookie and retrieve the authenticated user's data.

```typescript
const response = await fetch(`${BACKEND_URL}/api/auth/verify-token`, {
  method: "GET",
  credentials: "include", // IMPORTANT: sends the HttpOnly cookie
});

if (!response.ok) {
  // Token invalid or expired -- redirect to login
  window.location.href = "/login";
  return;
}

const data = await response.json();
// data structure:
// {
//   "message": "Token login successful",
//   "data": {
//     "access_token": "eyJhbGciOiJIUzI1NiIs...",
//     "user": {
//       "id": "abc123",
//       "username": "google_1713168000000_42",
//       "email": "user@gmail.com",
//       "role": "user",
//       "status": "approved",
//       "profileImageUrl": null
//     }
//   }
// }

// Store user data in your state management (e.g., Zustand, Redux, Pinia, signals, etc.)
setUser(data.data.user);

// Redirect to dashboard or home
window.location.href = "/dashboard";
```

> **Note:** The `access_token` field is returned in the response body for convenience, but the primary auth mechanism is the HttpOnly cookie. You do NOT need to manually attach the token to future requests -- the browser sends the cookie automatically.

---

## Step 3: Making Authenticated API Requests

After login, the `access_token` HttpOnly cookie is set on the browser. It is sent automatically with every request to the backend **as long as you include credentials**.

### Using Angular `HttpClient`

```typescript
// Option A: Per-request (if not using the credentials interceptor)
this.http
  .get(`${environment.backendUrl}/api/auth/profile`, {
    withCredentials: true,
  })
  .subscribe((res) => console.log(res));

// Option B: Automatic via interceptor (recommended -- see Full Example section)
// With the credentialsInterceptor registered, withCredentials is added automatically
this.http
  .get(`${environment.backendUrl}/api/auth/profile`)
  .subscribe((res) => console.log(res));
```

---

## Step 4: Logout

```typescript
// In your component or service
this.authService.logout().subscribe({
  next: () => {
    this.router.navigate(["/login"]);
  },
  error: () => {
    // Force redirect even if the request fails
    this.router.navigate(["/login"]);
  },
});
```

The backend clears the `access_token` cookie on logout.

---

## Full Example (Angular)

### 1. Auth Service

```typescript
// src/app/core/services/auth.service.ts
import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { BehaviorSubject, Observable, tap } from "rxjs";
import { environment } from "../../../environments/environment";

export interface AuthUser {
  id: string;
  username: string;
  email: string;
  role: string;
  status: string;
  profileImageUrl: string | null;
}

export interface AuthResponse {
  message: string;
  data: {
    access_token: string;
    user: AuthUser;
  };
}

@Injectable({ providedIn: "root" })
export class AuthService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {}

  /** Redirect the browser to the backend Google OAuth endpoint */
  loginWithGoogle(): void {
    window.location.href = `${environment.backendUrl}/api/auth/google`;
  }

  /** Call after Google redirect to validate the HttpOnly cookie and get user data */
  verifyToken(): Observable<AuthResponse> {
    return this.http
      .get<AuthResponse>(`${environment.backendUrl}/api/auth/verify-token`, {
        withCredentials: true,
      })
      .pipe(tap((res) => this.currentUserSubject.next(res.data.user)));
  }

  /** Logout: clears the HttpOnly cookie on the backend */
  logout(): Observable<{ message: string }> {
    return this.http
      .post<{
        message: string;
      }>(
        `${environment.backendUrl}/api/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(tap(() => this.currentUserSubject.next(null)));
  }

  /** Get current user profile (requires valid cookie) */
  getProfile(): Observable<{ message: string; data: AuthUser }> {
    return this.http.get<{ message: string; data: AuthUser }>(
      `${environment.backendUrl}/api/auth/profile`,
      { withCredentials: true },
    );
  }

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  get isLoggedIn(): boolean {
    return this.currentUserSubject.value !== null;
  }
}
```

### 2. HttpClient `withCredentials` Interceptor (Angular 17+)

To automatically include credentials on every request to the backend, add a functional interceptor:

```typescript
// src/app/core/interceptors/credentials.interceptor.ts
import { HttpInterceptorFn } from "@angular/common/http";
import { environment } from "../../../environments/environment";

export const credentialsInterceptor: HttpInterceptorFn = (req, next) => {
  if (req.url.startsWith(environment.backendUrl)) {
    req = req.clone({ withCredentials: true });
  }
  return next(req);
};
```

Register it in your app config:

```typescript
// src/app/app.config.ts
import { provideHttpClient, withInterceptors } from "@angular/common/http";
import { credentialsInterceptor } from "./core/interceptors/credentials.interceptor";

export const appConfig = {
  providers: [
    provideHttpClient(withInterceptors([credentialsInterceptor])),
    // ...other providers
  ],
};
```

> With this interceptor in place, you can omit `{ withCredentials: true }` from individual `HttpClient` calls -- it's added automatically for all backend requests.

### 3. Google Callback Component

```typescript
// src/app/pages/auth/google-callback/google-callback.component.ts
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-google-callback",
  standalone: true,
  template: `<p>{{ message }}</p>`,
})
export class GoogleCallbackComponent implements OnInit {
  message = "Signing you in...";

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    const error = this.route.snapshot.queryParamMap.get("error");

    if (error === "pending_approval") {
      this.message =
        "Your account is pending admin approval. Please wait for an administrator to approve your account.";
      return;
    }

    this.authService.verifyToken().subscribe({
      next: () => {
        this.router.navigate(["/dashboard"]);
      },
      error: () => {
        this.message = "Authentication failed. Please try again.";
        setTimeout(() => this.router.navigate(["/login"]), 2000);
      },
    });
  }
}
```

### 4. Route Configuration

```typescript
// src/app/app.routes.ts
import { Routes } from "@angular/router";

export const routes: Routes = [
  {
    path: "auth/google/callback",
    loadComponent: () =>
      import("./pages/auth/google-callback/google-callback.component").then(
        (m) => m.GoogleCallbackComponent,
      ),
  },
  // ...other routes
];
```

### 5. Login Button Component

```typescript
// src/app/shared/components/login-button/login-button.component.ts
import { Component } from "@angular/core";
import { AuthService } from "../../../core/services/auth.service";

@Component({
  selector: "app-login-button",
  standalone: true,
  template: `<button (click)="login()">Login with Google</button>`,
})
export class LoginButtonComponent {
  constructor(private authService: AuthService) {}

  login(): void {
    this.authService.loginWithGoogle();
  }
}
```

### 6. Environment Configuration

```typescript
// src/environments/environment.ts
export const environment = {
  production: false,
  backendUrl: "http://localhost:3000",
};

// src/environments/environment.prod.ts
export const environment = {
  production: true,
  backendUrl: "https://your-production-backend.com",
};
```

---

## API Reference

| Method | Endpoint                    | Auth   | Description                                 |
| ------ | --------------------------- | ------ | ------------------------------------------- |
| GET    | `/api/auth/google`          | Public | Initiates Google OAuth (full page redirect) |
| GET    | `/api/auth/google/callback` | Public | OAuth callback (handled by backend)         |
| GET    | `/api/auth/verify-token`    | Public | Validates cookie, returns user data         |
| GET    | `/api/auth/profile`         | JWT    | Returns current user profile                |
| POST   | `/api/auth/logout`          | Public | Clears auth cookie                          |

---

## Verify Token Response

```json
{
  "message": "Token login successful",
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "cuid-string",
      "username": "google_1713168000000_42",
      "email": "user@gmail.com",
      "role": "user",
      "status": "approved",
      "profileImageUrl": null
    }
  }
}
```

---

## Error Handling

| Scenario                       | What Happens                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------ |
| New user (first Google login)  | User created with `status: pending`. Redirected with `?error=pending_approval` |
| User status is `pending`       | Redirected to `{FRONTEND_URL}/auth/google/callback?error=pending_approval`     |
| User status is `rejected`      | Redirected to `{FRONTEND_URL}/auth/google/callback?error=pending_approval`     |
| User status is `approved`      | Cookie set, redirected to `{FRONTEND_URL}/auth/google/callback` (no error)     |
| Cookie expired / invalid token | `GET /api/auth/verify-token` returns `401 Unauthorized`                        |

---

## Important Notes

1. **`withCredentials: true` is mandatory** -- Without it, the browser will not send or accept the HttpOnly cookie. This applies to every `HttpClient` call that requires authentication. Use the `credentialsInterceptor` (shown in the Full Example) to apply this globally.

2. **CORS must allow credentials** -- The backend must have CORS configured with `credentials: true` and the frontend origin in `allowedOrigins`. This is already configured via `FRONTEND_URL`.

3. **New users require admin approval** -- First-time Google login creates a user with `pending` status. An admin must approve the user before they can access the app.

4. **No Google SDK needed on the frontend** -- The entire OAuth flow is handled server-side. The frontend only needs to redirect to the backend endpoint and handle the callback.

5. **Cookie lifetime is 1 day** -- The HttpOnly cookie expires after 24 hours. The JWT inside is valid for 7 days, but the cookie will be gone first. Users will need to re-login after the cookie expires.

6. **HttpOnly cookie cannot be read by JavaScript** -- This is a security feature. Use the `/api/auth/verify-token` endpoint to check auth status and get user data.
