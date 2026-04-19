# Home345 Bills API

All endpoints require:
- **Authentication**: Bearer token (JWT) or cookie `access_token`
- **Permission**: User must have `hasHome345Access = true` — otherwise `403 Forbidden`

Base URL: `/api` (or as configured)

---

## Bills

### Create a Bill
`POST /home345-bills`

**Body**
```json
{
  "seq": 1,
  "name": "April 2026",
  "date": "2026-04-01"
}
```

| Field | Type   | Required | Description                  |
|-------|--------|----------|------------------------------|
| seq   | number | Yes      | Display order (≥ 1)          |
| name  | string | Yes      | Bill period label            |
| date  | string | No       | ISO date string `YYYY-MM-DD` |

**Response** `201` — created bill object

---

### List All Bills
`GET /home345-bills`

Returns bills ordered by `seq DESC`, each with nested `billItems`. Supports pagination and completion filter.

**Query Parameters**

| Parameter   | Type    | Default | Description                        |
|-------------|---------|---------|------------------------------------|
| limit       | number  | 10      | Page size (≥ 1)                    |
| offset      | number  | 0       | Records to skip (≥ 0)              |
| isCompleted | boolean | —       | Filter by completion status        |

**Response** `200`
```json
{
  "data": [
    {
      "id": "uuid",
      "seq": 1,
      "name": "April 2026",
      "date": "2026-04-01",
      "isCompleted": false,
      "createdAt": "...",
      "updatedAt": "...",
      "billItems": [...]
    }
  ],
  "meta": {
    "totalRecords": 42,
    "limit": 10,
    "offset": 0
  }
}
```

---

### Get a Bill
`GET /home345-bills/:id`

**Response** `200` — bill with nested `billItems`
**Response** `404` — bill not found

---

### Update a Bill
`PATCH /home345-bills/:id`

**Body** — all fields optional
```json
{
  "seq": 2,
  "name": "April 2026 (revised)",
  "date": "2026-04-01",
  "isCompleted": false
}
```

**Response** `200` — updated bill

---

### Mark Bill as Completed
`PATCH /home345-bills/:id/complete`

Sets `isCompleted = true`. No body required.

**Response** `200` — updated bill

---

### Delete a Bill
`DELETE /home345-bills/:id`

Permanently deletes the bill and all its items (cascade).

**Response** `200` — deleted bill object

---

## Bill Items

### Add an Item to a Bill
`POST /home345-bills/:billId/items`

**Body**
```json
{
  "category": "ELECTRIC",
  "amount": 1500.00,
  "date": "2026-04-15",
  "note": "Units 250 kWh"
}
```

| Field    | Type   | Required | Description                                            |
|----------|--------|----------|--------------------------------------------------------|
| category | enum   | Yes      | `HOME_LOAN`, `ELECTRIC`, `WATER`, `INTERNET`, `OTHER` |
| amount   | number | Yes      | Bill amount (≥ 0)                                      |
| date     | string | No       | ISO date string `YYYY-MM-DD`                           |
| note     | string | No       | Optional note                                          |

**Response** `201` — created bill item

---

### Update a Bill Item
`PATCH /home345-bills/:billId/items/:itemId`

**Body** — all fields optional, also supports `isPaid`
```json
{
  "amount": 1600.00,
  "note": "Revised reading",
  "isPaid": true
}
```

**Response** `200` — updated item

---

### Mark Bill Item as Paid
`PATCH /home345-bills/:billId/items/:itemId/pay`

Sets `isPaid = true`. No body required.

**Response** `200` — updated item

---

### Remove a Bill Item
`DELETE /home345-bills/:billId/items/:itemId`

**Response** `200` — deleted item object

---

## Transactions

### Create a Transaction
`POST /home345-transactions`

**Body**
```json
{
  "name": "Shared Fund",
  "amount": 5000.00,
  "note": "Monthly contribution pool"
}
```

| Field  | Type   | Required | Description          |
|--------|--------|----------|----------------------|
| name   | string | Yes      | Transaction label    |
| amount | number | Yes      | Amount (≥ 0)         |
| note   | string | No       | Optional note        |

**Response** `201` — created transaction

---

### List All Transactions
`GET /home345-transactions`

Returns transactions ordered by `createdAt ASC`. Supports pagination.

**Query Parameters**

| Parameter | Type   | Default | Description           |
|-----------|--------|---------|-----------------------|
| limit     | number | 10      | Page size (≥ 1)       |
| offset    | number | 0       | Records to skip (≥ 0) |

**Response** `200`
```json
{
  "data": [...],
  "meta": {
    "totalRecords": 15,
    "limit": 10,
    "offset": 0
  }
}
```

---

### Get a Transaction
`GET /home345-transactions/:id`

**Response** `200` — transaction object
**Response** `404` — transaction not found

---

### Update a Transaction
`PATCH /home345-transactions/:id`

**Body** — all fields optional
```json
{
  "name": "Emergency Fund",
  "amount": 7500.00,
  "note": "Updated amount"
}
```

**Response** `200` — updated transaction

---

### Delete a Transaction
`DELETE /home345-transactions/:id`

**Response** `200` — deleted transaction object

---

## Error Responses

| Code | Meaning                              |
|------|--------------------------------------|
| 401  | Missing or invalid JWT               |
| 403  | User does not have Home345 access    |
| 404  | Resource not found                   |
| 400  | Validation error (bad request body)  |

---

## Granting Access

An admin must set `hasHome345Access = true` on the user record (via direct DB update or a future admin API) before that user can call any of these endpoints.
