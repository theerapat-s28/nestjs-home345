# Assets API Integration Guide

This document outlines how the frontend should integrate with the `Assets` module. The module provides endpoints for managing global asset definitions (like Stocks, Crypto, etc.) and tracking their price history.

## Base Path
All endpoints in this document are prefixed with:
`/assets`

## Authentication
This module requires authentication. Include the access token in the `Authorization` header for all requests:
`Authorization: Bearer <access-token>`

**Note:** Endpoints marked as **(Admin Only)** require the authenticated user to have the `ADMIN` role.

---

## Shared Enums

### AssetType
Used to categorize the asset.
- `STOCK`
- `CRYPTO`
- `GOLD`
- `FUTURES`
- `FOREX`
- `OTHER`

### Currency
Used to define the currency of an asset price.
- `USD`
- `EUR`
- `THB`

---

## Asset Management Endpoints

### 1. Identify/List Assets
**GET** `/assets`

Search, filter, and paginate through all registered global assets.

**Query Parameters:**
| Field    | Type        | Default | Description                                   |
|----------|-------------|---------|-----------------------------------------------|
| `search` | `string`    | None    | Optional. Search term for symbol or name.     |
| `type`   | `AssetType` | None    | Optional. Filter assets by type (e.g. STOCK). |
| `limit`  | `number`    | 20      | Optional. Number of results to return.        |
| `offset` | `number`    | 0       | Optional. Pagination offset.                  |

---

### 2. Get Single Asset Details
**GET** `/assets/:id`

Retrieve details of a specific asset by its UUID.

**Path Parameters:**
| Field | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Asset UUID  |

---

### 3. Create Asset *(Admin Only)*
**POST** `/assets`

Create a new global asset definition.

**Request Body (`application/json`):**
| Field    | Type        | Required | Description                     |
|----------|-------------|----------|---------------------------------|
| `symbol` | `string`    | Yes      | e.g. "BTC" (Max 20 chars).      |
| `name`   | `string`    | Yes      | e.g. "Bitcoin" (Max 255 chars). |
| `type`   | `AssetType` | Yes      | Category of the asset.          |

**Returns:** `201 Created`

---

### 4. Update Asset *(Admin Only)*
**PATCH** `/assets/:id`

Update an existing asset definition.

**Path Parameters:**
| Field | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Asset UUID  |

**Request Body (`application/json`):**
Fields are identical to **Create Asset**, but all are **optional**.

**Returns:** `200 OK`

---

### 5. Delete Asset *(Admin Only)*
**DELETE** `/assets/:id`

Soft-delete an asset.

**Path Parameters:**
| Field | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Asset UUID  |

**Returns:** `200 OK`

---

## Price History Endpoints

### 6. Get Latest Price
**GET** `/assets/:id/prices/latest`

Fetch the most recent recorded price for a specific asset.

**Path Parameters:**
| Field | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Asset UUID  |

---

### 7. Get Price History
**GET** `/assets/:id/prices`

Fetch the chronological price history list for a specific asset.

**Path Parameters:**
| Field | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Asset UUID  |

**Query Parameters:**
| Field    | Type   | Default | Description                            |
|----------|--------|---------|----------------------------------------|
| `limit`  | `number`| 50      | Optional. Number of records to return. |
| `offset` | `number`| 0       | Optional. Pagination offset.           |

---

### 8. Record New Price
**POST** `/assets/:id/prices`

Manually record a new price data point for an asset.

**Path Parameters:**
| Field | Type   | Description |
|-------|--------|-------------|
| `id`  | string | Asset UUID  |

**Request Body (`application/json`):**
| Field      | Type       | Required | Default | Description                                   |
|------------|------------|----------|---------|-----------------------------------------------|
| `price`    | `number`   | Yes      |         | Must be a positive number.                    |
| `currency` | `Currency` | No       | `THB`   | The currency of the given price.              |
| `source`   | `string`   | No       |         | The data source (e.g., "binance", "yahoo").   |

**Returns:** `201 Created`
