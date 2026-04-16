# User Profiles API Integration Guide

This document outlines how the frontend should integrate with the `User Profiles` module to manage user personal details and application preferences (like themes).

## Base Path
All endpoints are prefixed with:
`/user-profiles`

## Authentication
This module typically requires authentication. Ensure the access token is included in the `Authorization` header:
`Authorization: Bearer <access-token>`

**Note:** Basic profile data (`name`, `bio`, `profileImageUrl`, `theme`) is also returned by the Auth module (`/auth/login`, `/auth/verify-token`) to allow immediate frontend state initialization.

---

## Shared Enums

### Theme
Determines the frontend visual appearance.
- `ROOT`: Default light/standard theme.
- `DEEP_NIGHT`: Dark/Night mode theme.

---

## Profile Management Endpoints

### 1. Get User Profile
**GET** `/user-profiles/:userId`

Retrieve the profile details for a specific user.

**Path Parameters:**
| Field    | Type   | Description |
|----------|--------|-------------|
| `userId` | string | UUID of the user |

**Example Response:**
```json
{
  "id": "profile-uuid",
  "name": "John Doe",
  "bio": "Software Engineer",
  "profileImageUrl": "profiles/uuid/avatar.jpg",
  "theme": "DEEP_NIGHT",
  "userId": "user-uuid",
  "createdAt": "2026-04-16T15:40:08.000Z",
  "updatedAt": "2026-04-16T15:42:00.000Z",
  "user": {
    "id": "user-uuid",
    "username": "johndoe",
    "email": "john@example.com",
    "role": "USER"
  }
}
```

---

### 2. Update/Upsert Profile
**PATCH** `/user-profiles/:userId`

Update an existing user profile or create it if it doesn't exist for the user.

**Path Parameters:**
| Field    | Type   | Description |
|----------|--------|-------------|
| `userId` | string | UUID of the user |

**Request Body (`application/json`):**
| Field             | Type    | Required | Description                     |
|-------------------|---------|----------|---------------------------------|
| `name`            | string  | No       | User's display name.            |
| `bio`             | string  | No       | Short personal biography.       |
| `profileImageUrl` | string  | No       | Key of the uploaded profile img.|
| `theme`           | Theme   | No       | `ROOT` or `DEEP_NIGHT`.         |

**Returns:** The updated `UserProfile` object.

---

### 3. Initialize Profile (Advanced)
**POST** `/user-profiles`

Manually create a profile record. Usually, the `PATCH` endpoint is preferred as it handles both creation and update via upsert.

**Request Body (`application/json`):**
| Field             | Type    | Required | Description                     |
|-------------------|---------|----------|---------------------------------|
| `userId`          | string  | Yes      | UUID of the user.               |
| `name`            | string  | No       | User's display name.            |
| `bio`             | string  | No       | Short personal biography.       |
| `profileImageUrl` | string  | No       | Key of the uploaded profile img.|
| `theme`           | Theme   | No       | `ROOT` or `DEEP_NIGHT`.         |

**Returns:** `201 Created` with the new profile.
