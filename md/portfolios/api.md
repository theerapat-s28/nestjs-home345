# Portfolio & Asset Management API Integration Guide

This document provides instructions for frontend developers to integrate with the Portfolio and Asset management modules.

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
  "path": "/api/portfolios"
}
```

Paginated responses include:

```json
{
  "httpCode": 200,
  "message": "Success",
  "data": [ ... ],
  "pagination": { "totalRecords": 42, "limit": 20, "offset": 0 },
  "timestamp": "...",
  "path": "..."
}
```

Error responses:

```json
{
  "httpCode": 404,
  "message": "Portfolio abc123 not found",
  "timestamp": "...",
  "path": "..."
}
```

---

## User Flows

### Flow 1: First-Time User (Onboarding)

```
1. User logs in  ->  POST /auth/login  ->  receives access_token
2. User creates portfolio  ->  POST /portfolios  ->  becomes OWNER (ACTIVE)
3. User deposits initial cash  ->  POST /portfolios/:id/cash/operations
   { type: "DEPOSIT", amount: 100000, currency: "THB", executedAt: "..." }
4. User searches for an asset  ->  GET /assets?search=AAPL&type=STOCK
5. User records first trade  ->  POST /portfolios/:id/transactions
   { assetId: "...", type: "BUY", quantity: 10, pricePerUnit: 150, ... }
6. User views holdings  ->  GET /portfolios/:id/holdings
7. User views cash balances  ->  GET /portfolios/:id/cash
```

### Flow 2: Team Collaboration (Invite & Accept)

```
Portfolio Owner:
1. GET /portfolios                     ->  list my portfolios, find :id
2. POST /portfolios/:id/members/by-email -> invite user { email, role: "EDITOR" }
   (Alternatively) POST /portfolios/:id/members -> invite user { userId, role: "EDITOR" }

Invited User:
3. GET /portfolios                     ->  sees portfolio with myStatus: "PENDING"
4. POST /portfolios/:id/accept         ->  status changes to ACTIVE
   (or POST /portfolios/:id/reject     ->  membership removed)
5. Can now access portfolio based on role (EDITOR can trade, VIEWER can only read)
```

### Flow 3: Recording a Trade (BUY)

```
1. GET /assets?search=AAPL             ->  find the asset, get assetId
2. GET /assets/:assetId/prices/latest  ->  show current price to user
3. POST /portfolios/:id/transactions   ->  submit BUY order
   {
     "assetId": "...",
     "type": "BUY",
     "quantity": 10,
     "pricePerUnit": 150.25,
     "currency": "USD",
     "fee": 4.99,
     "executedAt": "2026-04-15T12:00:00Z"
   }
   Side effects (automatic):
   - PortfolioAsset holding created/updated (qty + weighted avg cost)
   - CashTransaction created (BUY_DEBIT: -(10 * 150.25 + 4.99) = -1507.49)
   - PortfolioCash balance reduced by 1507.49 USD
4. GET /portfolios/:id/holdings        ->  verify updated holdings
5. GET /portfolios/:id/cash            ->  verify updated cash balance
```

### Flow 4: Recording a Trade (SELL)

```
1. GET /portfolios/:id/holdings        ->  see current holdings, verify quantity available
2. POST /portfolios/:id/transactions
   { type: "SELL", quantity: 5, pricePerUnit: 175, ... }
   Side effects (automatic):
   - PortfolioAsset quantity reduced (avgCost unchanged)
   - CashTransaction created (SELL_CREDIT: +(5 * 175 - fee))
   - PortfolioCash balance increased
3. Refresh holdings and cash views
```

> **Important**: SELL fails with `400 Bad Request` if you try to sell more than the current holding quantity.

### Flow 5: Portfolio Dashboard

```
Parallel API calls for the dashboard page:
1. GET /portfolios/:id                 ->  portfolio name, members, metadata
2. GET /portfolios/:id/holdings        ->  all asset holdings with quantities & avg cost
3. GET /portfolios/:id/cash            ->  cash balances by currency
4. GET /portfolios/:id/transactions?limit=10  ->  recent transactions
5. GET /portfolios/:id/cash/transactions?limit=10  ->  recent cash movements
```

### Flow 6: Managing Cash

```
Deposit funds:
  POST /portfolios/:id/cash/operations
  { type: "DEPOSIT", amount: 50000, currency: "THB", executedAt: "..." }

Withdraw funds:
  POST /portfolios/:id/cash/operations
  { type: "WITHDRAWAL", amount: -10000, currency: "THB", executedAt: "..." }

Note: amount is positive for inflows, negative for outflows.
```

### Flow 7: Stock Split

```
Example: 4:1 split on 100 shares at avgCost of $200
  POST /portfolios/:id/transactions
  { type: "SPLIT", assetId: "...", quantity: 400, pricePerUnit: 50, ... }

Result:
  - quantity becomes 400 (the new total you specify)
  - avgCost recalculated: (200 * 100) / 400 = $50 (total cost basis preserved)
  - No cash effect
```

---

## 1. Portfolios

Manage investment portfolios and team members.

### Create Portfolio

`POST /portfolios`

- **Body**:
  ```json
  {
    "name": "My Portfolio",
    "description": "Tech stocks",
    "baseCurrency": "THB"
  }
  ```
- **Response**: `201 Created` - The creator is automatically added as `OWNER` with `ACTIVE` status.
- **Defaults**: `baseCurrency` defaults to `THB` if omitted.

### List My Portfolios

`GET /portfolios`

- **Response**: Paginated list of portfolios the user is a member of.
- **Response fields per portfolio**: `id`, `name`, `description`, `baseCurrency`, `createdAt`, `myRole`, `myStatus`, `_count: { members, assets }`
- **Note**: Returns portfolios with any membership status (including `PENDING`). Use `myStatus` to determine if the user needs to accept an invitation.

### Get Portfolio Details

`GET /portfolios/:id`

- **Response**: Full portfolio details including full member list (with user info).
- **Access**: Requires `ACTIVE` membership with at least `VIEWER` role.

### Update Portfolio

`PATCH /portfolios/:id`

- **Body**: `{ name?, description?, baseCurrency? }` (all optional)
- **Access**: Requires `EDITOR` or `OWNER` role.

### Delete Portfolio

`DELETE /portfolios/:id`

- **Access**: Requires `OWNER` role.
- **Behavior**: Soft-delete (sets `deletedAt`, `isActive: false`).

### Invite Member

`POST /portfolios/:id/members`

- **Body**: `{ "userId": "uuid", "role": "EDITOR" }`
- **Access**: Requires `OWNER` role.
- **Behavior**: Creates membership with `PENDING` status. If user was previously removed, re-inviting resets their status to `PENDING`.

### Invite Member by Email

`POST /portfolios/:id/members/by-email`

- **Body**: `{ "email": "user@example.com", "role": "EDITOR" }`
- **Access**: Requires `OWNER` role.
- **Response**: `201 Created`
- **Behavior**: 
  - Verifies if a user with the given email exists.
  - If user not found, returns `404 Not Found`.
  - Creates/updates membership with `PENDING` status.

### Update Member Role

`PATCH /portfolios/:id/members/:userId`

- **Body**: `{ "role": "VIEWER" }`
- **Access**: Requires `OWNER` role. Cannot change your own role.

### Remove Member

`DELETE /portfolios/:id/members/:userId`

- **Access**: Requires `OWNER` role. Cannot remove yourself (must transfer ownership first).
- **Behavior**: Hard-delete of the membership record.

### Accept Invitation

`POST /portfolios/:id/accept`

- **Access**: Must have a `PENDING` membership.
- **Behavior**: Changes status from `PENDING` to `ACTIVE`.

### Reject Invitation

`POST /portfolios/:id/reject`

- **Access**: Must have a `PENDING` membership.
- **Behavior**: Hard-deletes the membership record.

### List Holdings

`GET /portfolios/:id/holdings`

- **Access**: Requires `VIEWER` role.
- **Response**: List of all asset holdings with `quantity`, `avgCost`, asset details.

---

## 2. Assets (Global)

Global asset definitions shared across all portfolios. Assets are not portfolio-specific.

### Create Asset

`POST /assets`

- **Body**:
  ```json
  { "symbol": "AAPL", "name": "Apple Inc.", "type": "STOCK" }
  ```

### Search Assets

`GET /assets`

- **Query Params**: `search` (matches symbol or name, case-insensitive), `type` (AssetType), `limit` (default 20), `offset` (default 0)
- **Example**: `GET /assets?search=AAPL&type=STOCK&limit=10&offset=0`
- **Response**: Paginated list with `{ data, pagination }`.

### Get Single Asset

`GET /assets/:id`

### Update Asset

`PATCH /assets/:id`

- **Access**: System `ADMIN` role only.

### Delete Asset

`DELETE /assets/:id`

- **Access**: System `ADMIN` role only.
- **Behavior**: Soft-delete.

### Record Price

`POST /assets/:id/prices`

- **Body**:
  ```json
  { "price": 178.5, "currency": "USD", "source": "yahoo-finance" }
  ```

### Get Price History

`GET /assets/:id/prices?limit=20&offset=0`

- **Response**: Paginated list ordered by `recordedAt` descending.

### Get Latest Price

`GET /assets/:id/prices/latest`

- **Response**: Single latest price record, or `null` if no prices exist.

---

## 3. Transactions

Record buys, sells, dividends, splits, etc. All transactions are scoped to a portfolio.

### Add Transaction

`POST /portfolios/:portfolioId/transactions`

- **Access**: Requires `EDITOR` role.
- **Body**:
  ```json
  {
    "assetId": "uuid",
    "type": "BUY",
    "quantity": 10.5,
    "pricePerUnit": 150.25,
    "currency": "USD",
    "fee": 4.99,
    "note": "Bought on dip",
    "executedAt": "2026-04-15T12:00:00Z"
  }
  ```

#### Automatic Side Effects by Transaction Type

| Type           | Holding Effect                                                                              | Cash Effect                             |
| -------------- | ------------------------------------------------------------------------------------------- | --------------------------------------- |
| `BUY`          | Creates/updates holding. Weighted avg cost: `(oldQty * oldAvg + newQty * price) / totalQty` | **BUY_DEBIT**: `-(qty * price + fee)`   |
| `SELL`         | Reduces quantity (must have enough). Avg cost unchanged.                                    | **SELL_CREDIT**: `+(qty * price - fee)` |
| `DIVIDEND`     | No quantity change.                                                                         | **DIVIDEND**: `+(qty * pricePerUnit)`   |
| `FEE`          | No quantity change.                                                                         | **FEE**: `-fee`                         |
| `SPLIT`        | Sets quantity to the value you pass. Avg cost recalculated to preserve total cost basis.    | No cash effect                          |
| `TRANSFER_IN`  | Same as BUY (creates/updates holding with weighted avg).                                    | No cash effect                          |
| `TRANSFER_OUT` | Same as SELL (reduces quantity, validates sufficiency).                                     | No cash effect                          |

#### Validation Rules

- `SELL` / `TRANSFER_OUT`: Fails with `400` if current holding quantity is insufficient.
- `SELL` / `TRANSFER_OUT` on a non-existent holding: Fails with `400` ("you do not hold this asset").
- `fee` of `0` is stored as `null`.

### List Transactions

`GET /portfolios/:portfolioId/transactions`

- **Query Params**: `type` (TransactionType), `limit` (default 20), `offset` (default 0)
- **Access**: Requires `VIEWER` role.
- **Response**: Paginated list with asset details included.

### Get Single Transaction

`GET /portfolios/:portfolioId/transactions/:txnId`

- **Access**: Requires `VIEWER` role.

---

## 4. Cash Management

Manage fiat currency balances within a portfolio. Cash is tracked per currency.

### Get Cash Balances

`GET /portfolios/:portfolioId/cash`

- **Access**: Requires `VIEWER` role.
- **Response**: List of balances by currency (e.g., `[{ currency: "THB", balance: 50000 }, { currency: "USD", balance: 1200 }]`).

### Manual Cash Operation

`POST /portfolios/:portfolioId/cash/operations`

- **Access**: Requires `EDITOR` role.
- **Body**:
  ```json
  {
    "type": "DEPOSIT",
    "amount": 50000,
    "currency": "THB",
    "note": "Initial deposit",
    "executedAt": "2026-04-15T12:00:00Z"
  }
  ```
- **Amount convention**: Positive for inflows (`DEPOSIT`, `INTEREST`), negative for outflows (`WITHDRAWAL`).
- **Allowed types for manual operations**: `DEPOSIT`, `WITHDRAWAL`, `INTEREST`, `FEE`, `TRANSFER`, `OTHER`.
- **Note**: `BUY_DEBIT`, `SELL_CREDIT`, `DIVIDEND` are created automatically by transactions -- do not use these types for manual operations.

### List Cash Transactions

`GET /portfolios/:portfolioId/cash/transactions`

- **Query Params**: `type` (CashTxnType), `currency` (Currency), `limit` (default 20), `offset` (default 0)
- **Access**: Requires `VIEWER` role.
- **Response**: Paginated list of all cash movements (both manual and transaction-generated).

---

## Role-Based Access Matrix

| Action                 | VIEWER | EDITOR | OWNER |
| ---------------------- | ------ | ------ | ----- |
| View portfolio details | Y      | Y      | Y     |
| View holdings          | Y      | Y      | Y     |
| View cash balances     | Y      | Y      | Y     |
| View transactions      | Y      | Y      | Y     |
| View cash transactions | Y      | Y      | Y     |
| Update portfolio       | -      | Y      | Y     |
| Add transactions       | -      | Y      | Y     |
| Manual cash operations | -      | Y      | Y     |
| Delete portfolio       | -      | -      | Y     |
| Invite/remove members  | -      | -      | Y     |
| Change member roles    | -      | -      | Y     |

**Note**: All actions require `ACTIVE` membership status. `PENDING` members can only accept/reject their invitation.

---

## Enums

### Currency

`USD`, `EUR`, `THB`

### AssetType

`STOCK`, `CRYPTO`, `GOLD`, `FUTURES`, `FOREX`, `OTHER`

### PortfolioRole

`OWNER`, `EDITOR`, `VIEWER`

### MemberStatus

`PENDING`, `ACTIVE`, `REVOKED`

### TransactionType

`BUY`, `SELL`, `DIVIDEND`, `SPLIT`, `TRANSFER_IN`, `TRANSFER_OUT`, `FEE`

### CashTxnType

`DEPOSIT`, `WITHDRAWAL`, `BUY_DEBIT`, `SELL_CREDIT`, `DIVIDEND`, `FEE`, `TRANSFER`

---

## Frontend Implementation Recommendations

### Recommended Page Structure

```
/portfolios                   ->  Portfolio list (create, see invitations)
/portfolios/:id               ->  Dashboard (holdings, cash, recent activity)
/portfolios/:id/transactions  ->  Full transaction history
/portfolios/:id/cash          ->  Cash management (balances, operations, history)
/portfolios/:id/settings      ->  Members, portfolio settings (OWNER only)
/assets                       ->  Asset search & browse
/assets/:id                   ->  Asset detail with price history chart
```

### State Management Tips

1. **Portfolio list**: Cache the `GET /portfolios` response. Refresh when creating, accepting, or rejecting an invitation.

2. **Pending invitations**: Filter the portfolio list where `myStatus === "PENDING"` to show an invitation banner or notification badge.

3. **Dashboard data**: Fetch holdings, cash, and recent transactions in parallel on page load:

   ```
   Promise.all([
     api.get(`/portfolios/${id}/holdings`),
     api.get(`/portfolios/${id}/cash`),
     api.get(`/portfolios/${id}/transactions?limit=5`),
     api.get(`/portfolios/${id}/cash/transactions?limit=5`),
   ])
   ```

4. **After recording a transaction**: Invalidate/refetch both holdings and cash balances since both are affected.

5. **Role-based UI**: Use `myRole` from the portfolio list to conditionally render edit buttons, trade forms, and member management sections.

### Transaction Form UX

1. **Asset search**: Implement a debounced search input that queries `GET /assets?search=...` as the user types.
2. **Price suggestion**: When an asset is selected, fetch `GET /assets/:id/prices/latest` and pre-fill the `pricePerUnit` field.
3. **Dynamic form**: Show/hide fields based on `type`:
   - `BUY` / `SELL`: Show quantity, pricePerUnit, fee, currency
   - `DIVIDEND`: Show quantity (units held), pricePerUnit (dividend per unit)
   - `SPLIT`: Show quantity (new total shares), pricePerUnit (new price per share)
   - `FEE`: Show fee amount
   - `TRANSFER_IN` / `TRANSFER_OUT`: Show quantity, pricePerUnit (no cash effect)
4. **Preview**: Before submitting, show the calculated cash impact:
   - BUY: `Total cost = qty * price + fee`
   - SELL: `Total proceeds = qty * price - fee`
5. **Validation**: Disable SELL if the user does not hold the selected asset or holds less than the entered quantity.

### Error Handling

| HTTP Code | Meaning                                             | Frontend Action                              |
| --------- | --------------------------------------------------- | -------------------------------------------- |
| `400`     | Validation error (bad input, insufficient quantity) | Show field-level or form-level error message |
| `401`     | Token expired or missing                            | Redirect to login                            |
| `403`     | Insufficient role or inactive membership            | Show "access denied" and hide action buttons |
| `404`     | Resource not found                                  | Show "not found" page or redirect            |
| `409`     | Duplicate (e.g., unique constraint)                 | Show conflict message                        |
