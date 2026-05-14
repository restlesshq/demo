# APIs

This is a repo with a number of APIs, and can be used for trying out Restless!

| Service                          | Stack          | Port  |
|----------------------------------|----------------|-------|
| [`shipping-api/`](./shipping-api) | Fastify (Node) | 3001  |
| [`benefits-api/`](./benefits-api) | Express (Node) | 3002  |
| [`pizza-api/`](./pizza-api)       | Flask (Python) | 3003  |

Each directory has its own `README.md` with endpoint reference, sample API keys, and run instructions.

## Quick start

```sh
# Shipping
cd shipping-api && npm install && npm start

# Benefits
cd benefits-api && npm install && npm start

# Pizza
cd pizza-api && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && python app.py
```
