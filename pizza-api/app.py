import json
import os
import secrets
from datetime import datetime, timedelta, timezone
from flask import Flask, request, jsonify, g

from data import (
    stores,
    menu,
    ingredients,
    customers,
    drivers,
    orders,
    coupons,
)

_users_path = os.path.join(os.path.dirname(__file__), "..", "users.json")
with open(_users_path) as _f:
    users = json.load(_f)
users_by_api_key = {u["apiKey"]: u for u in users}

app = Flask(__name__)


# ── Errors ────────────────────────────────────────────
class ApiError(Exception):
    def __init__(self, code, message, status=400):
        self.code = code
        self.message = message
        self.status = status
        super().__init__(message)


@app.errorhandler(ApiError)
def _handle_api_error(err):
    return (
        jsonify({"error": {"code": err.code, "message": err.message}}),
        err.status,
        {"x-restless-error-code": err.code},
    )


@app.errorhandler(404)
def _not_found(_):
    return (
        jsonify({"error": {"code": "not_found", "message": "No such route."}}),
        404,
        {"x-restless-error-code": "not_found"},
    )


# ── Auth ──────────────────────────────────────────────
@app.before_request
def _auth():
    if request.path == "/v1/health":
        return
    auth = request.headers.get("Authorization", "")
    token = auth[7:] if auth.startswith("Bearer ") else auth
    user = users_by_api_key.get(token)
    if not user:
        raise ApiError(
            "auth_invalid_key",
            "Missing or invalid API key. Pass `Authorization: Bearer <key>`.",
            401,
        )
    g.account = user


# ── Helpers ───────────────────────────────────────────
def _new_id(prefix):
    return f"{prefix}_{secrets.token_hex(4)}"


def _require_fields(body, fields):
    if not isinstance(body, dict):
        raise ApiError("invalid_request", "Request body must be a JSON object.", 422)
    for f in fields:
        if body.get(f) in (None, ""):
            raise ApiError("invalid_request", f"Missing required field: {f}", 422)


def _find(items, **kwargs):
    for item in items:
        if all(item.get(k) == v for k, v in kwargs.items()):
            return item
    return None


def _menu_item(menu_id):
    return _find(menu, id=menu_id)


def _calc_pricing(items, coupon_code=None, delivery_fee_cents=399, tip_cents=0):
    subtotal = 0
    for it in items:
        m = _menu_item(it["menu_id"])
        if not m:
            raise ApiError("menu_item_not_found", f"Unknown menu item: {it['menu_id']}", 422)
        size = _find(m["sizes"], label=it["size"])
        if not size:
            raise ApiError("size_not_available", f"Size {it['size']} not available for {m['name']}.", 422)
        subtotal += size["price_cents"] * it.get("qty", 1)

    discount = 0
    if coupon_code:
        coupon = _find(coupons, code=coupon_code.upper(), active=True)
        if not coupon:
            raise ApiError("coupon_invalid", f"Coupon {coupon_code} is not valid.", 422)
        if subtotal < coupon["min_subtotal_cents"]:
            raise ApiError(
                "coupon_min_not_met",
                f"Coupon {coupon_code} requires a subtotal of at least {coupon['min_subtotal_cents']/100:.2f}.",
                422,
            )
        if coupon["kind"] == "percent":
            discount = subtotal * coupon["value"] // 100
        else:
            discount = coupon["value"]

    taxable = subtotal - discount
    tax = taxable * 95 // 1000  # 9.5%
    total = taxable + tax + delivery_fee_cents + tip_cents
    return {
        "subtotal_cents": subtotal,
        "discount_cents": discount,
        "tax_cents": tax,
        "delivery_fee_cents": delivery_fee_cents,
        "tip_cents": tip_cents,
        "total_cents": total,
    }


# ── Health ────────────────────────────────────────────
@app.get("/v1/health")
def health():
    return jsonify({"status": "ok", "version": "0.9.2"})


# ── Stores ────────────────────────────────────────────
@app.get("/v1/stores")
def list_stores():
    active = request.args.get("active")
    data = stores
    if active is not None:
        want = active.lower() in ("1", "true", "yes")
        data = [s for s in stores if s["active"] == want]
    return jsonify({"data": data, "count": len(data)})


@app.get("/v1/stores/<store_id>")
def get_store(store_id):
    store = _find(stores, id=store_id)
    if not store:
        raise ApiError("store_not_found", f"No store with id {store_id}", 404)
    return jsonify(store)


@app.get("/v1/stores/<store_id>/hours")
def store_hours(store_id):
    store = _find(stores, id=store_id)
    if not store:
        raise ApiError("store_not_found", f"No store with id {store_id}", 404)
    return jsonify({"store_id": store_id, "hours": store["hours"]})


# ── Menu ──────────────────────────────────────────────
@app.get("/v1/menu")
def list_menu():
    category = request.args.get("category")
    data = menu if not category else [m for m in menu if m["category"] == category]
    return jsonify({"data": data})


@app.get("/v1/menu/<item_id>")
def get_menu_item(item_id):
    item = _menu_item(item_id)
    if not item:
        raise ApiError("menu_item_not_found", f"No menu item with id {item_id}", 404)
    return jsonify(item)


@app.get("/v1/menu/<item_id>/ingredients")
def menu_item_ingredients(item_id):
    item = _menu_item(item_id)
    if not item:
        raise ApiError("menu_item_not_found", f"No menu item with id {item_id}", 404)
    # Naive: return all ingredients with a synthetic mapping.
    return jsonify({"menu_id": item_id, "ingredients": ingredients})


@app.get("/v1/ingredients")
def list_ingredients():
    return jsonify({"data": ingredients})


# ── Customers ─────────────────────────────────────────
@app.get("/v1/customers")
def list_customers():
    if g.account["role"] != "operator":
        raise ApiError("forbidden", "Operator role required to list customers.", 403)
    return jsonify({"data": customers})


@app.get("/v1/customers/<customer_id>")
def get_customer(customer_id):
    cus = _find(customers, id=customer_id)
    if not cus:
        raise ApiError("customer_not_found", f"No customer with id {customer_id}", 404)
    return jsonify(cus)


@app.post("/v1/customers")
def create_customer():
    body = request.get_json(silent=True) or {}
    _require_fields(body, ["name", "email", "phone"])
    cus = {"id": _new_id("cus"), **body}
    customers.append(cus)
    return jsonify(cus), 201


@app.put("/v1/customers/<customer_id>")
def update_customer(customer_id):
    cus = _find(customers, id=customer_id)
    if not cus:
        raise ApiError("customer_not_found", f"No customer with id {customer_id}", 404)
    body = request.get_json(silent=True) or {}
    cus.update(body)
    return jsonify(cus)


# ── Orders ────────────────────────────────────────────
@app.get("/v1/orders")
def list_orders():
    status = request.args.get("status")
    store_id = request.args.get("store_id")
    data = orders
    if status:
        data = [o for o in data if o["status"] == status]
    if store_id:
        data = [o for o in data if o["store_id"] == store_id]
    return jsonify({"data": data, "count": len(data)})


@app.get("/v1/orders/<order_id>")
def get_order(order_id):
    order = _find(orders, id=order_id)
    if not order:
        raise ApiError("order_not_found", f"No order with id {order_id}", 404)
    return jsonify(order)


@app.post("/v1/orders/quote")
def quote_order():
    body = request.get_json(silent=True) or {}
    _require_fields(body, ["items"])
    pricing = _calc_pricing(
        body["items"],
        coupon_code=body.get("coupon_code"),
        tip_cents=body.get("tip_cents", 0),
    )
    return jsonify(pricing)


@app.post("/v1/orders")
def create_order():
    body = request.get_json(silent=True) or {}
    _require_fields(body, ["store_id", "customer_id", "items", "delivery_address"])
    store = _find(stores, id=body["store_id"])
    if not store:
        raise ApiError("store_not_found", f"No store with id {body['store_id']}", 422)
    if not store["active"]:
        raise ApiError("store_inactive", f"Store {store['id']} is not accepting orders.", 409)
    if not _find(customers, id=body["customer_id"]):
        raise ApiError("customer_not_found", f"No customer with id {body['customer_id']}", 422)

    pricing = _calc_pricing(
        body["items"],
        coupon_code=body.get("coupon_code"),
        tip_cents=body.get("tip_cents", 0),
    )

    order = {
        "id": _new_id("ord"),
        "status": "received",
        "driver_id": None,
        "placed_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "promised_at": (datetime.now(timezone.utc) + timedelta(minutes=40)).isoformat().replace("+00:00", "Z"),
        **{k: v for k, v in body.items() if k != "coupon_code"},
        **pricing,
    }
    orders.append(order)
    return jsonify(order), 201


@app.post("/v1/orders/<order_id>/cancel")
def cancel_order(order_id):
    order = _find(orders, id=order_id)
    if not order:
        raise ApiError("order_not_found", f"No order with id {order_id}", 404)
    if order["status"] in ("delivered", "cancelled"):
        raise ApiError("order_not_cancellable", f"Order is {order['status']} and cannot be cancelled.", 409)
    if order["status"] == "out_for_delivery":
        raise ApiError("order_in_transit", "Order has already left the store.", 409)
    order["status"] = "cancelled"
    return jsonify(order)


@app.post("/v1/orders/<order_id>/assign-driver")
def assign_driver(order_id):
    order = _find(orders, id=order_id)
    if not order:
        raise ApiError("order_not_found", f"No order with id {order_id}", 404)
    body = request.get_json(silent=True) or {}
    _require_fields(body, ["driver_id"])
    driver = _find(drivers, id=body["driver_id"])
    if not driver:
        raise ApiError("driver_not_found", f"No driver with id {body['driver_id']}", 422)
    if driver["status"] != "available":
        raise ApiError("driver_unavailable", f"Driver {driver['id']} is {driver['status']}.", 409)
    order["driver_id"] = driver["id"]
    driver["status"] = "on_delivery"
    return jsonify(order)


@app.post("/v1/orders/<order_id>/mark-delivered")
def mark_delivered(order_id):
    order = _find(orders, id=order_id)
    if not order:
        raise ApiError("order_not_found", f"No order with id {order_id}", 404)
    order["status"] = "delivered"
    order["delivered_at"] = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    if order.get("driver_id"):
        driver = _find(drivers, id=order["driver_id"])
        if driver:
            driver["status"] = "available"
    return jsonify(order)


# ── Drivers ───────────────────────────────────────────
@app.get("/v1/drivers")
def list_drivers():
    return jsonify({"data": drivers})


@app.get("/v1/drivers/<driver_id>")
def get_driver(driver_id):
    driver = _find(drivers, id=driver_id)
    if not driver:
        raise ApiError("driver_not_found", f"No driver with id {driver_id}", 404)
    return jsonify(driver)


@app.put("/v1/drivers/<driver_id>/status")
def update_driver_status(driver_id):
    driver = _find(drivers, id=driver_id)
    if not driver:
        raise ApiError("driver_not_found", f"No driver with id {driver_id}", 404)
    body = request.get_json(silent=True) or {}
    _require_fields(body, ["status"])
    if body["status"] not in ("available", "on_delivery", "off_shift"):
        raise ApiError("invalid_status", f"Unknown driver status: {body['status']}", 422)
    driver["status"] = body["status"]
    return jsonify(driver)


# ── Coupons ───────────────────────────────────────────
@app.get("/v1/coupons")
def list_coupons():
    return jsonify({"data": [c for c in coupons if c["active"]]})


@app.get("/v1/coupons/<code>")
def get_coupon(code):
    coupon = _find(coupons, code=code.upper())
    if not coupon:
        raise ApiError("coupon_not_found", f"No coupon with code {code}", 404)
    return jsonify(coupon)


# ── Run ───────────────────────────────────────────────
if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 3003))
    app.run(host="0.0.0.0", port=port, debug=True)
