"""In-memory seed data. Backed by Postgres in production."""

stores = [
    {
        "id": "str_oakland_hayes",
        "name": "Slice Society — Hayes & Telegraph",
        "address_line1": "1418 Hayes Ave",
        "city": "Oakland",
        "state": "CA",
        "postal_code": "94606",
        "phone": "+15105550162",
        "hours": {"mon_thu": "11:00-22:00", "fri_sat": "11:00-00:00", "sun": "12:00-21:00"},
        "delivery_radius_mi": 4.5,
        "active": True,
    },
    {
        "id": "str_oakland_glenview",
        "name": "Slice Society — Glenview",
        "address_line1": "4188 Park Blvd",
        "city": "Oakland",
        "state": "CA",
        "postal_code": "94602",
        "phone": "+15105550199",
        "hours": {"mon_thu": "11:00-22:00", "fri_sat": "11:00-00:00", "sun": "12:00-21:00"},
        "delivery_radius_mi": 5.0,
        "active": True,
    },
]

menu = [
    {
        "id": "pizza_margherita",
        "category": "pizzas",
        "name": "Margherita",
        "description": "San Marzano tomato, fior di latte, basil.",
        "sizes": [
            {"label": "10\"", "price_cents": 1600},
            {"label": "14\"", "price_cents": 2200},
            {"label": "18\"", "price_cents": 2700},
        ],
    },
    {
        "id": "pizza_pepperoni",
        "category": "pizzas",
        "name": "The Goodfellas",
        "description": "Crispy pepperoni cup, tomato, low-moisture mozz, calabrian honey drizzle.",
        "sizes": [
            {"label": "10\"", "price_cents": 1800},
            {"label": "14\"", "price_cents": 2500},
            {"label": "18\"", "price_cents": 3000},
        ],
    },
    {
        "id": "pizza_mushroom",
        "category": "pizzas",
        "name": "Funghi Bianca",
        "description": "Cremini and shiitake, ricotta, garlic confit, thyme, no red sauce.",
        "sizes": [
            {"label": "10\"", "price_cents": 1900},
            {"label": "14\"", "price_cents": 2600},
            {"label": "18\"", "price_cents": 3100},
        ],
    },
    {
        "id": "side_garlic_knots",
        "category": "sides",
        "name": "Garlic knots (6)",
        "description": "House dough, garlic butter, parsley, parmigiano.",
        "sizes": [{"label": "regular", "price_cents": 700}],
    },
    {
        "id": "side_caesar",
        "category": "sides",
        "name": "Little Gem Caesar",
        "description": "Little gem, anchovy dressing, sourdough crouton.",
        "sizes": [{"label": "regular", "price_cents": 1100}],
    },
    {
        "id": "drink_soda",
        "category": "drinks",
        "name": "Mexican Coke",
        "description": "355ml glass bottle.",
        "sizes": [{"label": "12oz", "price_cents": 400}],
    },
]

ingredients = [
    {"id": "ing_dough_classic", "name": "Classic dough", "allergens": ["gluten"], "vegan": True},
    {"id": "ing_dough_gf", "name": "Gluten-free dough", "allergens": [], "vegan": True},
    {"id": "ing_mozz", "name": "Fior di latte", "allergens": ["dairy"], "vegan": False},
    {"id": "ing_pepperoni", "name": "Cup-and-char pepperoni", "allergens": ["pork"], "vegan": False},
    {"id": "ing_basil", "name": "Fresh basil", "allergens": [], "vegan": True},
    {"id": "ing_anchovy", "name": "Anchovy", "allergens": ["fish"], "vegan": False},
]

customers = [
    {
        "id": "cus_dlsteen",
        "name": "Daria Steen",
        "email": "daria.steen@example.com",
        "phone": "+15105550104",
        "default_address": {
            "line1": "2200 MacArthur Blvd",
            "city": "Oakland",
            "state": "CA",
            "postal_code": "94602",
        },
    },
    {
        "id": "cus_mhouse",
        "name": "Marcus House",
        "email": "mhouse@example.com",
        "phone": "+15105550130",
        "default_address": {
            "line1": "440 Grand Ave",
            "city": "Oakland",
            "state": "CA",
            "postal_code": "94610",
        },
    },
]

drivers = [
    {"id": "drv_01", "name": "Lupe Aguilar", "phone": "+15105550111", "vehicle": "Honda Element", "status": "available"},
    {"id": "drv_02", "name": "Tomas Reilly", "phone": "+15105550133", "vehicle": "e-bike", "status": "on_delivery"},
]

orders = [
    {
        "id": "ord_8821",
        "store_id": "str_oakland_hayes",
        "customer_id": "cus_dlsteen",
        "status": "out_for_delivery",
        "driver_id": "drv_02",
        "items": [
            {"menu_id": "pizza_pepperoni", "size": "14\"", "qty": 1, "price_cents": 2500},
            {"menu_id": "side_garlic_knots", "size": "regular", "qty": 1, "price_cents": 700},
        ],
        "subtotal_cents": 3200,
        "tax_cents": 304,
        "delivery_fee_cents": 399,
        "tip_cents": 600,
        "total_cents": 4503,
        "delivery_address": {
            "line1": "2200 MacArthur Blvd",
            "city": "Oakland",
            "state": "CA",
            "postal_code": "94602",
        },
        "placed_at": "2026-05-14T18:42:11Z",
        "promised_at": "2026-05-14T19:22:00Z",
    },
    {
        "id": "ord_8822",
        "store_id": "str_oakland_glenview",
        "customer_id": "cus_mhouse",
        "status": "in_oven",
        "driver_id": None,
        "items": [
            {"menu_id": "pizza_mushroom", "size": "18\"", "qty": 1, "price_cents": 3100},
            {"menu_id": "side_caesar", "size": "regular", "qty": 1, "price_cents": 1100},
            {"menu_id": "drink_soda", "size": "12oz", "qty": 2, "price_cents": 400},
        ],
        "subtotal_cents": 5000,
        "tax_cents": 475,
        "delivery_fee_cents": 399,
        "tip_cents": 800,
        "total_cents": 6674,
        "delivery_address": {
            "line1": "440 Grand Ave",
            "city": "Oakland",
            "state": "CA",
            "postal_code": "94610",
        },
        "placed_at": "2026-05-14T19:02:51Z",
        "promised_at": "2026-05-14T19:45:00Z",
    },
]

coupons = [
    {"code": "FIRSTSLICE", "kind": "percent", "value": 15, "min_subtotal_cents": 2000, "active": True},
    {"code": "LUNCH5", "kind": "flat_cents", "value": 500, "min_subtotal_cents": 1500, "active": True},
    {"code": "WELCOME2024", "kind": "percent", "value": 10, "min_subtotal_cents": 0, "active": False},
]

api_keys = {
    "ps_live_demo_daria_77ab": {"id": "acct_daria", "name": "Daria Steen", "role": "customer"},
    "ps_live_demo_ops_91x2": {"id": "acct_ops", "name": "Store Ops", "role": "operator"},
}
