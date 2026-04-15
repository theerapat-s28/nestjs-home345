# Authentication API Documentation

This document provides instructions for frontend developers on how to integrate with the Authentication services.

## Overview

The authentication system supports:
- Standard Email/Password registration and login.
- Google OAuth2 integration.
- Session management using JSON Web Tokens (JWT) stored in HTTP-Only cookies or sent via Authorization headers.

---

## 1. Authentication Flow

### A. Email/Password Flow
1. **Register**: Send user details to `/auth/register`.
2. **Login**: Send credentials to `/auth/login`.
3. **Response**: Both endpoints return a JWT `access_token` and user profile details.
4. **Token Storage**: The frontend should store the `access_token` (e.g., in a secure state manager or local storage) and include it in the `Authorization: Bearer <token>` header for subsequent requests.

### B. Google OAuth Flow
1. **Initiate**: Redirect the user to `${BACKEND_URL}/auth/google`.
2. **Callback**: The backend handles the Google redirect and sets an **HTTP-Only cookie** named `access_token`.
3. **Frontend Redirect**: After setting the cookie, the backend redirects the user to `${FRONTEND_URL}/auth/google/callback`.
4. **Verification**: On the `/auth/google/callback` page, the frontend must call `GET /auth/verify-token`. This endpoint reads the cookie and returns the user profile and token details.

---

## 2. Endpoints

### Register User
`POST /auth/register`

**Request Body (`RegisterCredentialDto`):**
```json
{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "StrongPassword123",
  "role": "user", // Optional: admin | user
  "positionId": "uuid-string" // Optional
}
```

**Response (201 Created):**
Returns the same structure as the Login response.

---

### Login (Local)
`POST /auth/login`

**Request Body (`LoginCredentialDto`):**
```json
{
  "username": "john_doe",
  "password": "StrongPassword123"
}
```

**Response (200 OK):**
```json
{
  "message": "User successfully logged in",
  "data": {
    "access_token": "eyJhbG...",
    "user": {
      "id": "uuid",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "user",
      "status": "active",
      "employeeId": null,
      "position": "Developer",
      "profileImageUrl": "https://..."
    }
  }
}
```

---

### Google OAuth Login
`GET /auth/google`

Initiates the Google OAuth2 flow. This should be handled by a direct link or `window.location.href` redirect.

---

### Verify Token (Google Flow)
`GET /auth/verify-token`

Used to retrieve user data after a Google login redirect.

**Request Requirements:**
- Must include `withCredentials: true` (if using Axios) or `credentials: 'include'` (if using Fetch) to send the `access_token` cookie.

**Response (200 OK):**
Same structure as the Login response.

---

### Get User Profile
`GET /auth/profile`

**Headers:**
- `Authorization: Bearer <token>` (or via `access_token` cookie)

**Response (200 OK):**
Returns the profile of the currently authenticated user.

---

### Logout
`POST /auth/logout`

Clears the `access_token` cookie on the backend.

**Request Requirements:**
- Must include `withCredentials: true` or `credentials: 'include'`.

---

## 3. Important Notes for Frontend

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
