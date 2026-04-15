# Authentication Guide

Base URL: `http://localhost:3000/api`

---

## 1. Credential Login (Username & Password)

### Register

```http
POST /api/auth/register
Content-Type: application/json
```

```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "StrongPassword123"
}
```

Password rules: minimum 8 characters, at least one uppercase letter, one lowercase letter, and one number.

**Response `201`**

```json
{
  "message": "User registered successfully",
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "profileImageUrl": null
  }
}
```

---

### Login

```http
POST /api/auth/login
Content-Type: application/json
```

```json
{
  "username": "john_doe",
  "password": "StrongPassword123"
}
```

**Response `200`**

```json
{
  "message": "Login successful",
  "data": {
    "access_token": "<JWT>",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "USER",
      "status": "ACTIVE",
      "profileImageUrl": null
    }
  }
}
```

Use the returned `access_token` as a Bearer token on all subsequent requests:

```http
Authorization: Bearer <access_token>
```

---

### Possible login errors

| Status | Reason |
|--------|--------|
| `401`  | Invalid username or password |
| `401`  | Account pending admin approval |
| `401`  | Account rejected or suspended |
| `401`  | Account was created via Google — use Google login instead |

---

## 2. Google OAuth Login

The Google OAuth flow works differently by method (app vs. Swagger). In both cases the backend sets an **HttpOnly cookie** (`access_token`) rather than returning the token in the body.

### Step-by-step (Frontend / App)

```
1. Redirect the user to  GET /api/auth/google
2. Google redirects back  GET /api/auth/google/callback  (handled by the backend)
3. Backend sets the HttpOnly cookie and redirects to:
     <FRONTEND_URL>/auth/google/callback
4. Frontend calls        GET /api/auth/verify-token
   → backend reads the cookie and returns the user + a fresh JWT
```

**Step 4 — verify-token response `200`**

```json
{
  "message": "Token login successful",
  "data": {
    "access_token": "<JWT>",
    "user": {
      "id": "uuid",
      "username": "google_1718500000_42",
      "email": "john@gmail.com",
      "role": "USER",
      "status": "ACTIVE",
      "profileImageUrl": null
    }
  }
}
```

Store `access_token` in memory (not localStorage) and attach it as `Authorization: Bearer <token>` on API calls.

#### Error redirect

If the account is `PENDING` or `REJECTED`, the backend redirects to:

```
<FRONTEND_URL>/auth/google/callback?error=pending_approval
```

Handle this on the frontend callback page to show an appropriate message.

---

### New Google accounts

When a user signs in with Google for the first time, the backend auto-creates their account with `status: PENDING`. A **admin must approve** the account before the user can log in. Until approved, every login attempt returns the `pending_approval` error redirect.

---

### Step-by-step (Swagger UI)

1. Open `http://localhost:3000/api/docs`
2. Navigate to **Authentication → GET /api/auth/google**
3. Click **Try it out → Execute**  
   — this redirects to Google consent, then back to Swagger with the cookie set.
4. You are now authenticated. All Swagger requests will carry the cookie automatically.

To log out from Swagger, call `POST /api/auth/logout` from Swagger UI — it detects the `Referer` header and clears the Swagger-scoped cookie.

---

## 3. Get Authenticated User Profile

```http
GET /api/auth/profile
Authorization: Bearer <access_token>
```

**Response `200`**

```json
{
  "message": "Profile retrieved successfully",
  "data": {
    "id": "uuid",
    "username": "john_doe",
    "email": "john@example.com",
    "role": "USER",
    "status": "ACTIVE",
    "profileImageUrl": null
  }
}
```

---

## 4. Logout

```http
POST /api/auth/logout
```

Clears the `access_token` HttpOnly cookie. No body required. Discard the JWT on the client side as well.

**Response `200`**

```json
{ "message": "Successfully logged out" }
```

---

## 5. Account Statuses

| Status    | Description |
|-----------|-------------|
| `PENDING` | Account created but awaiting admin approval (Google OAuth new accounts) |
| `ACTIVE`  | Fully active — login allowed |
| `REJECTED`| Rejected or suspended — login blocked |

---

## 6. JWT Token

The JWT payload contains:

```json
{ "username": "john_doe", "sub": "<userId>", "role": "USER" }
```

Expiry is controlled by `JWT_EXPIRES_IN` in `.env` (default `7d`). After expiry the user must log in again — there is no refresh-token endpoint.

---

## 7. Important Notes for Frontend

### Security & Cookies
When using Google Login, the `access_token` is stored in an **HTTP-Only cookie**. This means:
1. You cannot access the token via `document.cookie`.
2. You must ensure all API requests to the backend include credentials:
   - **Axios**: `axios.defaults.withCredentials = true;`
   - **Fetch**: `fetch(url, { credentials: 'include' });`

### Domain Configuration
The backend sets the cookie for the domain specified in the `FRONTEND_URL` environment variable. Ensure your frontend and backend domains are correctly configured to allow cross-site cookies if they are on different subdomains.

### Error Handling
- **401 Unauthorized**: Redirect user to login page.
- **Pending Approval**: If Google login fails with `error=pending_approval` in the query string, it means the user account exists but is not yet active.
