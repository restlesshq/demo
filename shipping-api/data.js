// In-memory seed data. Backed by Postgres in production.

const carriers = [
  { id: "ups", name: "UPS", services: ["ground", "2day", "next_day", "international"] },
  { id: "fedex", name: "FedEx", services: ["ground", "express_saver", "priority_overnight", "international"] },
  { id: "usps", name: "USPS", services: ["first_class", "priority", "priority_express", "media_mail"] },
  { id: "dhl", name: "DHL", services: ["express_worldwide", "express_12_00", "economy_select"] },
];

const addresses = [
  {
    id: "addr_8h2js",
    name: "Walter Sobchak",
    company: null,
    line1: "608 Venezia Ave",
    line2: null,
    city: "Venice",
    state: "CA",
    postalCode: "90291",
    country: "US",
    phone: "+13105550144",
    residential: true,
  },
  {
    id: "addr_pq9d2",
    name: "Acme Returns Center",
    company: "Acme Corp",
    line1: "1100 Industrial Pkwy",
    line2: "Dock 7",
    city: "Reno",
    state: "NV",
    postalCode: "89512",
    country: "US",
    phone: "+17755550199",
    residential: false,
  },
];

const shipments = [
  {
    id: "shp_01HXAB",
    status: "in_transit",
    carrier: "ups",
    service: "ground",
    trackingNumber: "1Z999AA10123456784",
    from: "addr_pq9d2",
    to: "addr_8h2js",
    weightOz: 48,
    dimensions: { length: 12, width: 9, height: 4 },
    rateCents: 1875,
    insuredValueCents: 5000,
    createdAt: "2026-05-10T14:22:00Z",
    estimatedDeliveryAt: "2026-05-16T20:00:00Z",
  },
  {
    id: "shp_01HXCD",
    status: "delivered",
    carrier: "fedex",
    service: "express_saver",
    trackingNumber: "770123456789",
    from: "addr_pq9d2",
    to: "addr_8h2js",
    weightOz: 12,
    dimensions: { length: 8, width: 6, height: 2 },
    rateCents: 1199,
    insuredValueCents: 0,
    createdAt: "2026-05-02T09:15:00Z",
    estimatedDeliveryAt: "2026-05-06T20:00:00Z",
  },
];

const trackingEvents = {
  "1Z999AA10123456784": [
    { at: "2026-05-10T14:22:00Z", code: "label_created", location: "Reno, NV", description: "Shipping label created" },
    { at: "2026-05-11T03:40:00Z", code: "picked_up", location: "Reno, NV", description: "Picked up by carrier" },
    { at: "2026-05-12T18:05:00Z", code: "in_transit", location: "Sacramento, CA", description: "Departed facility" },
    { at: "2026-05-13T07:30:00Z", code: "in_transit", location: "Oakland, CA", description: "Arrived at facility" },
  ],
  "770123456789": [
    { at: "2026-05-02T09:15:00Z", code: "label_created", location: "Reno, NV", description: "Shipping label created" },
    { at: "2026-05-03T11:20:00Z", code: "picked_up", location: "Reno, NV", description: "Picked up by carrier" },
    { at: "2026-05-05T16:45:00Z", code: "out_for_delivery", location: "Venice, CA", description: "Out for delivery" },
    { at: "2026-05-05T19:12:00Z", code: "delivered", location: "Venice, CA", description: "Delivered, front door" },
  ],
};

const pickups = [
  {
    id: "pkp_4f8a",
    carrier: "ups",
    address: "addr_pq9d2",
    window: { date: "2026-05-15", start: "13:00", end: "17:00" },
    shipmentIds: ["shp_01HXAB"],
    status: "scheduled",
  },
];

const returns = [
  {
    id: "rtn_zk21",
    originalShipmentId: "shp_01HXCD",
    reason: "wrong_size",
    status: "label_issued",
    trackingNumber: "770999111222",
    createdAt: "2026-05-09T16:00:00Z",
  },
];

const webhooks = [
  {
    id: "wh_2nx",
    url: "https://example.com/hooks/shipping",
    events: ["shipment.delivered", "shipment.exception"],
    secret: "whsec_demoonly_do_not_use",
    active: true,
  },
];

const apiKeys = new Map([
  ["sk_test_demo_walter_8h2js", { id: "usr_walter", name: "Walter Sobchak", plan: "starter" }],
  ["sk_test_demo_acme_pq9d2", { id: "usr_acme", name: "Acme Corp", plan: "business" }],
]);

module.exports = {
  carriers,
  addresses,
  shipments,
  trackingEvents,
  pickups,
  returns,
  webhooks,
  apiKeys,
};
