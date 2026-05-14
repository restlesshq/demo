# Shipping API

Multi-carrier shipping API. Rate shopping, label purchase, tracking, pickups, and returns across UPS, FedEx, USPS, and DHL.

## Run

```sh
npm install
npm start
```

Server listens on `http://localhost:3001`.

## Authentication

All requests require a Bearer token in the `Authorization` header:

```sh
curl -H "Authorization: Bearer demo_walter" http://localhost:3001/v1/shipments
```

Sample keys (from [`../users.json`](../users.json)):

| Key            | Pretending to be     |
|----------------|----------------------|
| `demo_walter`  | Walter Sobchak (Sobchak Security, starter plan) |
| `demo_maude`   | Maude Lebowski (Hollywood Star Lanes, business plan) |
| `demo_dude`    | Jeffrey Lebowski (solo, starter plan) |
| `demo_daria`   | Daria Steen (solo, starter plan) |

## Endpoints

### Health
- `GET /v1/health`

### Carriers
- `GET /v1/carriers`
- `GET /v1/carriers/:id`
- `GET /v1/carriers/:id/services`

### Addresses
- `GET /v1/addresses`
- `GET /v1/addresses/:id`
- `POST /v1/addresses`
- `PUT /v1/addresses/:id`
- `DELETE /v1/addresses/:id`
- `POST /v1/addresses/:id/verify`

### Rates
- `POST /v1/rates`

### Shipments
- `GET /v1/shipments` (filterable by `status`, `carrier`, `limit`)
- `GET /v1/shipments/:id`
- `POST /v1/shipments`
- `POST /v1/shipments/:id/cancel`
- `GET /v1/shipments/:id/label`
- `POST /v1/shipments/:id/reprint`

### Tracking
- `GET /v1/tracking/:number`
- `POST /v1/tracking/:number/subscribe`

### Pickups
- `GET /v1/pickups`
- `POST /v1/pickups`
- `DELETE /v1/pickups/:id`

### Returns
- `GET /v1/returns`
- `GET /v1/returns/:id`
- `POST /v1/returns`

### Webhooks
- `GET /v1/webhooks`
- `POST /v1/webhooks`
- `DELETE /v1/webhooks/:id`
- `POST /v1/webhooks/:id/rotate-secret`

### Account
- `GET /v1/account`
