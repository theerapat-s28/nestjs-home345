# Transactions API Integration Guide

This document describes the Transactions API for frontend developers.

## Base URL

`{{BACKEND_URL}}/api`

## Authentication

All endpoints require a Bearer token in the `Authorization` header.
`Authorization: Bearer <access_token>`

## Response Shape

All API responses follow a consistent envelope:

```json
{
  "httpCode": 200,
  "message": "Success",
  "data": { ... },
  "pagination": null,
  "timestamp": "2026-04-15T12:00:00.000Z",
  "path": "/api/portfolios/:portfolioId/transactions"
}
```

Paginated responses include a `meta` object inside `data`:

```json
{
  "data": [...],
  "meta": {
    "totalRecords": 50,
    "limit": 20,
    "offset": 0
  }
}
```

---

## Transaction Types

| Value | Description | Holding effect | Cash effect |
|---|---|---|---|
| `BUY` | Purchase asset | qty ↑, avgCost recalculated (WACC) | Debit `-(qty × price + fee)` |
| `SELL` | Sell asset | qty ↓, avgCost unchanged | Credit `(qty × price - fee)` |
| `DIVIDEND` | Dividend received | No change | Credit `(qty × pricePerUnit)` |
| `FEE` | Standalone fee | No change | Debit `-fee` |
| `TRANSFER_IN` | Asset transferred in | qty ↑, avgCost recalculated (WACC) | No cash effect |
| `TRANSFER_OUT` | Asset transferred out | qty ↓ | No cash effect |
| `SPLIT` | Stock split | qty = new total; avgCost adjusted proportionally | No cash effect |

> For `DIVIDEND` and `FEE`, set `quantity: 1` and use `pricePerUnit` as the total amount.

---

## Endpoints

### 1. Record a Transaction

**POST** `/portfolios/:portfolioId/transactions`

Required role: **EDITOR** or **OWNER**

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `portfolioId` | string (UUID) | Portfolio to record the transaction under |

#### Request Body

```json
{
  "assetId": "asset-uuid-here",
  "type": "BUY",
  "quantity": 10,
  "pricePerUnit": 3200000,
  "currency": "THB",
  "fee": 75,
  "note": "Bought on a dip",
  "executedAt": "2026-04-15T14:00:00.000Z"
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `assetId` | string (UUID) | Yes | Asset being transacted |
| `type` | `TransactionType` | Yes | See Transaction Types table above |
| `quantity` | number (positive) | Yes | Units. Use `1` for DIVIDEND/FEE |
| `pricePerUnit` | number (positive) | Yes | Price per unit in `currency`. For DIVIDEND/FEE use total amount |
| `currency` | `Currency` | Yes | e.g. `THB`, `USD` |
| `fee` | number | No | Trading fee. Defaults to `0` |
| `note` | string (max 500) | No | Free-text note |
| `executedAt` | ISO 8601 date string | Yes | When the transaction occurred |

#### Response `201 Created`

```json
{
  "message": "Transaction recorded successfully",
  "data": {
    "id": "txn-uuid",
    "type": "BUY",
    "quantity": 10,
    "pricePerUnit": 3200000,
    "currency": "THB",
    "fee": 75,
    "note": "Bought on a dip",
    "executedAt": "2026-04-15T14:00:00.000Z",
    "createdAt": "2026-04-15T14:01:00.000Z",
    "portfolioAsset": {
      "id": "holding-uuid",
      "asset": {
        "id": "asset-uuid",
        "symbol": "BTC",
        "name": "Bitcoin",
        "type": "CRYPTO"
      }
    },
    "cashTransaction": {
      "id": "cash-txn-uuid",
      "type": "BUY_DEBIT",
      "amount": -32000075,
      "currency": "THB"
    }
  }
}
```

> `cashTransaction` is `null` for `TRANSFER_IN`, `TRANSFER_OUT`, and `SPLIT`.

#### Error Responses

| Status | Scenario |
|---|---|
| `400` | SELL/TRANSFER_OUT with no existing holding |
| `400` | Selling more than currently held |
| `403` | Caller has VIEWER role only |
| `404` | Asset not found |

---

### 2. List Transactions

**GET** `/portfolios/:portfolioId/transactions`

Required role: **VIEWER** or above

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `portfolioId` | string (UUID) | Portfolio to query |

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|---|---|---|---|---|
| `type` | `TransactionType` | No | — | Filter by transaction type |
| `limit` | number | No | `20` | Page size |
| `offset` | number | No | `0` | Number of records to skip |

#### Response `200 OK`

```json
{
  "data": [
    {
      "id": "txn-uuid",
      "type": "BUY",
      "quantity": 10,
      "pricePerUnit": 3200000,
      "currency": "THB",
      "fee": 75,
      "note": "Bought on a dip",
      "executedAt": "2026-04-15T14:00:00.000Z",
      "createdAt": "2026-04-15T14:01:00.000Z",
      "portfolioAsset": {
        "id": "holding-uuid",
        "asset": { "id": "asset-uuid", "symbol": "BTC", "name": "Bitcoin", "type": "CRYPTO" }
      },
      "cashTransaction": {
        "id": "cash-txn-uuid",
        "type": "BUY_DEBIT",
        "amount": -32000075,
        "currency": "THB"
      }
    }
  ],
  "meta": {
    "totalRecords": 50,
    "limit": 20,
    "offset": 0
  }
}
```

Results are ordered by `executedAt` descending (newest first).

---

### 3. Get a Single Transaction

**GET** `/portfolios/:portfolioId/transactions/:txnId`

Required role: **VIEWER** or above

#### Path Parameters

| Parameter | Type | Description |
|---|---|---|
| `portfolioId` | string (UUID) | Portfolio UUID |
| `txnId` | string (UUID) | Transaction UUID |

#### Response `200 OK`

Same shape as a single item in the List response above.

#### Error Responses

| Status | Scenario |
|---|---|
| `403` | Not a member of the portfolio |
| `404` | Transaction not found or does not belong to this portfolio |

---

## Cash Side-Effects

Recording certain transactions automatically updates the portfolio cash balance:

| Transaction type | Cash entry type | Amount formula |
|---|---|---|
| `BUY` | `BUY_DEBIT` | `-(qty × pricePerUnit + fee)` |
| `SELL` | `SELL_CREDIT` | `qty × pricePerUnit - fee` |
| `DIVIDEND` | `DIVIDEND` | `qty × pricePerUnit` |
| `FEE` | `FEE` | `-fee` |

`TRANSFER_IN`, `TRANSFER_OUT`, and `SPLIT` produce **no** cash entry.
