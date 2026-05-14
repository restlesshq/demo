# APIs

This is a repo with a number of APIs, and can be used for trying out Restless!

| Service                          | Stack          | Port  |
|----------------------------------|----------------|-------|
| [`shipping-api/`](./shipping-api) | Fastify (Node) | 3001  |
| [`benefits-api/`](./benefits-api) | Express (Node) | 3002  |
| [`pizza-api/`](./pizza-api)       | Flask (Python) | 3003  |

Each directory has its own `README.md` with endpoint reference, sample API keys, and run instructions.

## Sample API keys

All three APIs share the same user list at [`users.json`](./users.json). One key works across every service:

| Key            | Name              | Company               | Role     | Plan     |
|----------------|-------------------|-----------------------|----------|----------|
| `demo_walter`  | Walter Sobchak    | Sobchak Security      | customer | starter  |
| `demo_maude`   | Maude Lebowski    | Hollywood Star Lanes  | operator | business |
| `demo_dude`    | Jeffrey Lebowski  | (none)                | customer | starter  |
| `demo_daria`   | Daria Steen       | (none)                | customer | starter  |

Pass it as `Authorization: Bearer <key>` on any of the three APIs.

## Quick start

```sh
# Shipping
cd shipping-api && npm install && npm start

# Benefits
cd benefits-api && npm install && npm start

# Pizza
cd pizza-api && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python app.py
```
