# Slice Society API

Pizza ordering, menu, store, driver, and coupon management.

## Run

```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

Server listens on `http://localhost:3003`.

## Authentication

```sh
curl -H "Authorization: Bearer ps_live_demo_daria_77ab" http://localhost:3003/v1/menu
```

Two roles are issued: `customer` keys can place and view orders; `operator` keys can list customers, assign drivers, and mark deliveries.

## Endpoints

### Health
- `GET /v1/health`

### Stores
- `GET /v1/stores` (filter with `?active=true`)
- `GET /v1/stores/<store_id>`
- `GET /v1/stores/<store_id>/hours`

### Menu & ingredients
- `GET /v1/menu` (filter with `?category=pizzas|sides|drinks`)
- `GET /v1/menu/<item_id>`
- `GET /v1/menu/<item_id>/ingredients`
- `GET /v1/ingredients`

### Customers
- `GET /v1/customers` *(operator only)*
- `GET /v1/customers/<customer_id>`
- `POST /v1/customers`
- `PUT /v1/customers/<customer_id>`

### Orders
- `GET /v1/orders` (filter with `?status=`, `?store_id=`)
- `GET /v1/orders/<order_id>`
- `POST /v1/orders/quote`
- `POST /v1/orders`
- `POST /v1/orders/<order_id>/cancel`
- `POST /v1/orders/<order_id>/assign-driver`
- `POST /v1/orders/<order_id>/mark-delivered`

### Drivers
- `GET /v1/drivers`
- `GET /v1/drivers/<driver_id>`
- `PUT /v1/drivers/<driver_id>/status`

### Coupons
- `GET /v1/coupons`
- `GET /v1/coupons/<code>`
