const fastify = require("fastify")({ logger: true });
const crypto = require("node:crypto");
const {
  carriers,
  addresses,
  shipments,
  trackingEvents,
  pickups,
  returns,
  webhooks,
  apiKeys,
} = require("./data");

// ── Error helper ─────────────────────────────────────
class ApiError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

fastify.setErrorHandler((err, req, reply) => {
  if (err instanceof ApiError) {
    reply.code(err.status).send({ error: { code: err.code, message: err.message } });
    return;
  }
  reply.send(err);
});

// ── Auth ─────────────────────────────────────────────
fastify.addHook("onRequest", async (req, reply) => {
  if (req.url === "/health" || req.url === "/v1/health") return;

  const auth = req.headers["authorization"] || "";
  const key = auth.startsWith("Bearer ") ? auth.slice(7) : auth;
  const account = key && apiKeys.get(key);
  if (!account) {
    throw new ApiError(
      "auth_invalid_key",
      "Missing or invalid API key. Pass a valid key as `Authorization: Bearer <key>`.",
      401,
    );
  }
  req.account = account;
});

// ── Helpers ──────────────────────────────────────────
const findAddress = (id) => addresses.find((a) => a.id === id);
const findShipment = (id) => shipments.find((s) => s.id === id);
const findCarrier = (id) => carriers.find((c) => c.id === id);
const findWebhook = (id) => webhooks.find((w) => w.id === id);
const findPickup = (id) => pickups.find((p) => p.id === id);
const findReturn = (id) => returns.find((r) => r.id === id);

const newId = (prefix) =>
  `${prefix}_${crypto.randomBytes(5).toString("base64url")}`;

const requireFields = (body, fields) => {
  for (const f of fields) {
    if (body == null || body[f] == null || body[f] === "") {
      throw new ApiError("invalid_request", `Missing required field: ${f}`, 422);
    }
  }
};

const quoteRate = (weightOz, service) => {
  const base = { ground: 700, "2day": 1500, next_day: 2900, international: 4200,
    express_saver: 1200, priority_overnight: 3200,
    first_class: 450, priority: 850, priority_express: 2600, media_mail: 380,
    express_worldwide: 4800, "express_12_00": 6200, economy_select: 2200 };
  const perOz = 28;
  return (base[service] ?? 900) + Math.max(0, weightOz - 8) * perOz;
};

// ── Health ───────────────────────────────────────────
fastify.get("/v1/health", async () => ({
  status: "ok",
  uptime: process.uptime(),
  version: "1.4.0",
}));

// ── Carriers ─────────────────────────────────────────
fastify.get("/v1/carriers", async () => ({ data: carriers }));

fastify.get("/v1/carriers/:id", async (req) => {
  const carrier = findCarrier(req.params.id);
  if (!carrier) throw new ApiError("carrier_not_found", `No carrier with id ${req.params.id}`, 404);
  return carrier;
});

fastify.get("/v1/carriers/:id/services", async (req) => {
  const carrier = findCarrier(req.params.id);
  if (!carrier) throw new ApiError("carrier_not_found", `No carrier with id ${req.params.id}`, 404);
  return { carrier: carrier.id, services: carrier.services };
});

// ── Addresses ────────────────────────────────────────
fastify.get("/v1/addresses", async () => ({ data: addresses, count: addresses.length }));

fastify.get("/v1/addresses/:id", async (req) => {
  const addr = findAddress(req.params.id);
  if (!addr) throw new ApiError("address_not_found", `No address with id ${req.params.id}`, 404);
  return addr;
});

fastify.post("/v1/addresses", async (req, reply) => {
  requireFields(req.body, ["name", "line1", "city", "postalCode", "country"]);
  const addr = { id: newId("addr"), residential: true, ...req.body };
  addresses.push(addr);
  reply.code(201);
  return addr;
});

fastify.put("/v1/addresses/:id", async (req) => {
  const addr = findAddress(req.params.id);
  if (!addr) throw new ApiError("address_not_found", `No address with id ${req.params.id}`, 404);
  Object.assign(addr, req.body);
  return addr;
});

fastify.delete("/v1/addresses/:id", async (req, reply) => {
  const idx = addresses.findIndex((a) => a.id === req.params.id);
  if (idx === -1) throw new ApiError("address_not_found", `No address with id ${req.params.id}`, 404);
  addresses.splice(idx, 1);
  reply.code(204);
});

fastify.post("/v1/addresses/:id/verify", async (req) => {
  const addr = findAddress(req.params.id);
  if (!addr) throw new ApiError("address_not_found", `No address with id ${req.params.id}`, 404);
  if (addr.postalCode === "00000") {
    return { verified: false, reason: "postal_code_unknown" };
  }
  return { verified: true, normalized: { ...addr, line1: addr.line1.toUpperCase() } };
});

// ── Rates ────────────────────────────────────────────
fastify.post("/v1/rates", async (req) => {
  requireFields(req.body, ["from", "to", "weightOz"]);
  const { from, to, weightOz, dimensions } = req.body;
  if (!findAddress(from)) throw new ApiError("address_not_found", `Unknown from address ${from}`, 422);
  if (!findAddress(to)) throw new ApiError("address_not_found", `Unknown to address ${to}`, 422);
  if (weightOz > 70 * 16) {
    throw new ApiError("weight_exceeded", "Shipments over 70lb require a freight quote.", 409);
  }

  const quotes = [];
  for (const carrier of carriers) {
    for (const service of carrier.services) {
      quotes.push({
        carrier: carrier.id,
        service,
        rateCents: quoteRate(weightOz, service),
        estimatedDays: service.includes("overnight") || service === "next_day" ? 1
          : service.includes("2day") || service === "priority_express" ? 2
          : service.includes("international") ? 6 : 4,
      });
    }
  }
  return { from, to, weightOz, dimensions: dimensions ?? null, quotes };
});

// ── Shipments ────────────────────────────────────────
fastify.get("/v1/shipments", async (req) => {
  const { status, carrier, limit } = req.query;
  let list = shipments;
  if (status) list = list.filter((s) => s.status === status);
  if (carrier) list = list.filter((s) => s.carrier === carrier);
  if (limit) list = list.slice(0, Number(limit));
  return { data: list, count: list.length };
});

fastify.get("/v1/shipments/:id", async (req) => {
  const shp = findShipment(req.params.id);
  if (!shp) throw new ApiError("shipment_not_found", `No shipment with id ${req.params.id}`, 404);
  return shp;
});

fastify.post("/v1/shipments", async (req, reply) => {
  requireFields(req.body, ["from", "to", "carrier", "service", "weightOz"]);
  const { from, to, carrier, service, weightOz, dimensions, insuredValueCents } = req.body;
  if (!findAddress(from)) throw new ApiError("address_not_found", `Unknown from address ${from}`, 422);
  if (!findAddress(to)) throw new ApiError("address_not_found", `Unknown to address ${to}`, 422);
  const carrierObj = findCarrier(carrier);
  if (!carrierObj) throw new ApiError("carrier_not_found", `Unknown carrier ${carrier}`, 422);
  if (!carrierObj.services.includes(service)) {
    throw new ApiError("service_not_supported", `Carrier ${carrier} does not offer ${service}.`, 422);
  }

  const shp = {
    id: newId("shp"),
    status: "label_created",
    carrier,
    service,
    trackingNumber: crypto.randomBytes(6).toString("hex").toUpperCase(),
    from,
    to,
    weightOz,
    dimensions: dimensions ?? null,
    rateCents: quoteRate(weightOz, service),
    insuredValueCents: insuredValueCents ?? 0,
    createdAt: new Date().toISOString(),
    estimatedDeliveryAt: new Date(Date.now() + 5 * 86400000).toISOString(),
  };
  shipments.push(shp);
  trackingEvents[shp.trackingNumber] = [{
    at: shp.createdAt,
    code: "label_created",
    location: findAddress(from).city + ", " + findAddress(from).state,
    description: "Shipping label created",
  }];
  reply.code(201);
  return shp;
});

fastify.post("/v1/shipments/:id/cancel", async (req) => {
  const shp = findShipment(req.params.id);
  if (!shp) throw new ApiError("shipment_not_found", `No shipment with id ${req.params.id}`, 404);
  if (shp.status === "delivered") {
    throw new ApiError("shipment_already_delivered", "Cannot cancel a delivered shipment.", 409);
  }
  if (shp.status === "in_transit") {
    throw new ApiError("shipment_in_transit", "Shipment has already left the origin facility.", 409);
  }
  shp.status = "cancelled";
  return shp;
});

fastify.get("/v1/shipments/:id/label", async (req) => {
  const shp = findShipment(req.params.id);
  if (!shp) throw new ApiError("shipment_not_found", `No shipment with id ${req.params.id}`, 404);
  return {
    shipmentId: shp.id,
    format: "pdf",
    sizeBytes: 38420,
    url: `https://labels.example.com/${shp.id}.pdf`,
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
  };
});

fastify.post("/v1/shipments/:id/reprint", async (req) => {
  const shp = findShipment(req.params.id);
  if (!shp) throw new ApiError("shipment_not_found", `No shipment with id ${req.params.id}`, 404);
  return {
    shipmentId: shp.id,
    reprintToken: crypto.randomBytes(8).toString("hex"),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
});

// ── Tracking ─────────────────────────────────────────
fastify.get("/v1/tracking/:number", async (req) => {
  const events = trackingEvents[req.params.number];
  if (!events) throw new ApiError("tracking_not_found", `No tracking data for ${req.params.number}`, 404);
  const last = events[events.length - 1];
  return {
    trackingNumber: req.params.number,
    status: last.code,
    lastUpdate: last.at,
    events,
  };
});

fastify.post("/v1/tracking/:number/subscribe", async (req) => {
  requireFields(req.body, ["callbackUrl"]);
  return {
    trackingNumber: req.params.number,
    callbackUrl: req.body.callbackUrl,
    subscriptionId: newId("trk_sub"),
  };
});

// ── Pickups ──────────────────────────────────────────
fastify.get("/v1/pickups", async () => ({ data: pickups }));

fastify.post("/v1/pickups", async (req, reply) => {
  requireFields(req.body, ["carrier", "address", "window", "shipmentIds"]);
  const carrier = findCarrier(req.body.carrier);
  if (!carrier) throw new ApiError("carrier_not_found", `Unknown carrier ${req.body.carrier}`, 422);
  if (!findAddress(req.body.address)) {
    throw new ApiError("address_not_found", `Unknown address ${req.body.address}`, 422);
  }
  for (const sid of req.body.shipmentIds) {
    if (!findShipment(sid)) throw new ApiError("shipment_not_found", `Unknown shipment ${sid}`, 422);
  }
  const pickup = { id: newId("pkp"), status: "scheduled", ...req.body };
  pickups.push(pickup);
  reply.code(201);
  return pickup;
});

fastify.delete("/v1/pickups/:id", async (req, reply) => {
  const pickup = findPickup(req.params.id);
  if (!pickup) throw new ApiError("pickup_not_found", `No pickup with id ${req.params.id}`, 404);
  pickup.status = "cancelled";
  reply.code(200);
  return pickup;
});

// ── Returns ──────────────────────────────────────────
fastify.get("/v1/returns", async () => ({ data: returns }));

fastify.get("/v1/returns/:id", async (req) => {
  const ret = findReturn(req.params.id);
  if (!ret) throw new ApiError("return_not_found", `No return with id ${req.params.id}`, 404);
  return ret;
});

fastify.post("/v1/returns", async (req, reply) => {
  requireFields(req.body, ["originalShipmentId", "reason"]);
  if (!findShipment(req.body.originalShipmentId)) {
    throw new ApiError("shipment_not_found", `Unknown shipment ${req.body.originalShipmentId}`, 422);
  }
  const ret = {
    id: newId("rtn"),
    status: "label_issued",
    trackingNumber: crypto.randomBytes(6).toString("hex").toUpperCase(),
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  returns.push(ret);
  reply.code(201);
  return ret;
});

// ── Webhooks ─────────────────────────────────────────
fastify.get("/v1/webhooks", async () => ({ data: webhooks.map(({ secret, ...rest }) => rest) }));

fastify.post("/v1/webhooks", async (req, reply) => {
  requireFields(req.body, ["url", "events"]);
  const wh = {
    id: newId("wh"),
    secret: "whsec_" + crypto.randomBytes(16).toString("hex"),
    active: true,
    ...req.body,
  };
  webhooks.push(wh);
  reply.code(201);
  return wh;
});

fastify.delete("/v1/webhooks/:id", async (req, reply) => {
  const idx = webhooks.findIndex((w) => w.id === req.params.id);
  if (idx === -1) throw new ApiError("webhook_not_found", `No webhook with id ${req.params.id}`, 404);
  webhooks.splice(idx, 1);
  reply.code(204);
});

fastify.post("/v1/webhooks/:id/rotate-secret", async (req) => {
  const wh = findWebhook(req.params.id);
  if (!wh) throw new ApiError("webhook_not_found", `No webhook with id ${req.params.id}`, 404);
  wh.secret = "whsec_" + crypto.randomBytes(16).toString("hex");
  return wh;
});

// ── Account ──────────────────────────────────────────
fastify.get("/v1/account", async (req) => req.account);

// ── Start server ─────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;
fastify.listen({ port: PORT, host: "0.0.0.0" }, (err) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
