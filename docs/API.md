# AutoDesk REST API

Base URL: `http://localhost:5000/api`. JSON requests use `Content-Type: application/json`. Staff operations use the HTTP-only `autodesk_session` cookie created by sign-in. The browser sends it with credentialed requests. No endpoint returns a password hash.

Successful responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "message": "...", "errors": [] }`. A list response uses `data: { items, page, limit, total, pages }`. Lists default to 100 records per page and cap `limit` at 500.

## Health

### `GET /health`

Unauthenticated. Returns API and MongoDB availability separately. HTTP 200 means MongoDB is connected; HTTP 503 means the API process is reachable but the database is not healthy.

Example:

```json
{
  "success": true,
  "data": {
    "api": "running",
    "database": "connected",
    "transactions": "unsupported",
    "databaseName": "autodesk"
  }
}
```

`transactions` is `supported` only when MongoDB reports a replica set or mongos deployment.

## Authentication

### `POST /auth/login`

Unauthenticated; limited to 10 attempts per IP per 15 minutes.

```json
{ "email": "staff@example.com", "password": "your staff password" }
```

Returns the staff user's `id`, `name`, `email`, and `role`, and sets an HTTP-only, SameSite Strict session cookie. Invalid credentials return HTTP 401.

### `POST /auth/logout`

Clears the session cookie. No request body.

### `GET /auth/me`

Requires a valid staff session. Returns the current staff profile.

### `PATCH /auth/password`

Requires a valid staff session. The new password must be 12-200 characters. The current password is verified, the new value is bcrypt-hashed, and the session is cleared.

```json
{ "currentPassword": "current password", "newPassword": "a new long password" }
```

Initial staff users are created with `npm --prefix backend run create-admin -- "Name" "email"`; public registration is not provided.

## Vehicles

All vehicle routes require staff sign-in.

### `GET /vehicles`

Supports `page`, `limit`, `search` (ID, brand, model), `brand`, `category`, `year`, `status` (`Active` or `Archived`), `stockStatus` (`In stock`, `Low stock`, `Out of stock`), `minPrice`, `maxPrice` (rupees), `sort` (`vehicleId`, `brand`, `model`, `manufacturingYear`, `listedPricePaise`, `stockQuantity`), and `order` (`asc` or `desc`). Arbitrary MongoDB operators and sort fields are not accepted.

### `POST /vehicles`

Creates a vehicle. Required: `id`, `brand`, `model`, `year`, `category`, `fuel`, `transmission`, `color`, `price` (rupees), and `stock`. Optional: `threshold`, `description`.

```json
{
  "id": "VH-2040",
  "brand": "Tata",
  "model": "Nexon",
  "year": 2025,
  "category": "Compact SUV",
  "fuel": "Petrol",
  "transmission": "Manual",
  "color": "Graphite Grey",
  "price": 915000,
  "stock": 5,
  "threshold": 2,
  "description": "Compact SUV."
}
```

Duplicate IDs return HTTP 409. Stock must be a non-negative integer, and the price must be positive.

### `GET /vehicles/:id`

Returns one record identified by its business vehicle ID.

### `PATCH /vehicles/:id`

Updates the allowed editable vehicle fields. Business IDs cannot be changed.

### `DELETE /vehicles/:id`

Deletes a record with no sales or stock-adjustment history. Otherwise it marks the record Archived so referenced history is preserved.

## Customers

All customer routes require staff sign-in.

### `GET /customers`

Supports `page`, `limit`, `search` (customer ID, name, or phone), and `status` (`Active` or `Archived`).

### `POST /customers`

Required: `id`, `name`, `phone`, and `address`. `email` and `status` are accepted when provided.

```json
{
  "id": "CU-2040",
  "name": "Aarav Mehta",
  "phone": "+91 98765 43210",
  "email": "aarav@example.com",
  "address": "Pune, Maharashtra",
  "status": "Active"
}
```

### `GET /customers/:id`

Returns a customer by business customer ID.

### `PATCH /customers/:id`

Updates allowed contact fields. The customer business ID cannot change.

### `DELETE /customers/:id`

Deletes customers without sales history; customers referenced by a sale are archived.

## Sales

All sales routes require staff sign-in. Sale creation and cancellation require a MongoDB replica set or mongos transaction-capable deployment. The API rejects these writes with HTTP 503 on standalone MongoDB rather than performing non-atomic writes.

### `GET /sales`

Supports `page`, `limit`, `search`, `status` (`Completed` or `Cancelled`), `from`, `to`, `customer` (customer business ID), and `vehicle` (vehicle business ID).

### `POST /sales`

Required: active `vehicleId`, active `customerId`, positive integer `quantity`, positive `unitPrice` in rupees, and optionally `discount` in rupees and `date` (`YYYY-MM-DD`). The API calculates `totalAmountPaise`, creates immutable vehicle/customer invoice snapshots, and decrements stock within one transaction. Client-provided totals and sale IDs are ignored.

```json
{
  "vehicleId": "VH-2040",
  "customerId": "CU-2040",
  "quantity": 2,
  "unitPrice": 900000,
  "discount": 10000,
  "date": "2026-10-28"
}
```

Insufficient stock returns HTTP 409. Invalid references return HTTP 404. Standalone MongoDB returns HTTP 503.

### `GET /sales/:id`

Returns a sale by business sale ID, including populated current references and historical snapshots.

### `POST /sales/:id/cancel`

Restores the sold quantity and marks the sale Cancelled once, in one transaction. Repeated cancellation returns HTTP 409.

## Stock adjustments

### `GET /stock-adjustments`

Requires staff sign-in. Supports `page` and `limit`. Adjustment records are read-only after creation.

### `POST /stock-adjustments`

Requires staff sign-in and transaction support. Required: active `vehicleId`, non-zero integer `change`, and a reason of at least three characters. The response includes the immutable audit record and updated vehicle.

## Dashboard, reports, and settings

All routes below require staff sign-in.

- `GET /dashboard/summary`: active inventory units/records, completed sales count/units/revenue in paise, and low-stock active vehicles.
- `GET /dashboard/recent-sales?limit=5`: recent sales, newest first.
- `GET /reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD&brand=Tata&status=Completed`: sales matching date, brand, and status filters.
- `GET /reports/inventory`: active vehicles.
- `GET /settings`: showroom and staff display settings, creating the single `showroom` settings document on first request.
- `PUT /settings`: updates staff display name/email, showroom name, INR preference, low-stock threshold, and notification preferences. Other fields are ignored.

The CSV button exports the filtered records currently loaded by the reports screen. Invoice printing is handled by the browser's print dialog using the invoice-specific print stylesheet.
