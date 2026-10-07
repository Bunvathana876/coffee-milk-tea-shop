"""Catalog seed dataset and idempotent seeding function."""
import logging
from sqlalchemy.orm import Session
from app.models.category import Category
from app.models.product import Product

logger = logging.getLogger(__name__)

SEED_CATEGORIES = [
    {
        "name": "Coffee",
        "description": "Artisan espresso drinks and slow-brewed coffees made from premium roasted beans",
        "image": "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=600&auto=format&fit=crop&q=80",
        "is_active": True,
    },
    {
        "name": "Milk Tea",
        "description": "Handcrafted milk teas brewed with loose leaf teas, fresh milk, and signature boba",
        "image": "https://images.unsplash.com/photo-1558857563-b37cf5a1334c?w=600&auto=format&fit=crop&q=80",
        "is_active": True,
    },
    {
        "name": "Fruit Tea",
        "description": "Vibrant, refreshing iced teas infused with real tropical fruits and floral notes",
        "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80",
        "is_active": True,
    },
    {
        "name": "Smoothies",
        "description": "Thick, creamy fruit blends and frappes crafted with fresh ingredients and ice",
        "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80",
        "is_active": True,
    },
    {
        "name": "Matcha",
        "description": "Authentic stone-ground Uji matcha lattes and specialty fusion drinks",
        "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
        "is_active": True,
    },
]

SEED_PRODUCTS = [
    # --- Coffee ---
    {
        "category_name": "Coffee",
        "name": "Iced Americano",
        "description": "Bold double espresso poured over purified chilled water and crisp ice.",
        "image": "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.00,
        "is_available": True,
    },
    {
        "category_name": "Coffee",
        "name": "Iced Latte",
        "description": "Freshly pulled espresso layered smoothly with velvety chilled whole milk.",
        "image": "https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.50,
        "is_available": True,
    },
    {
        "category_name": "Coffee",
        "name": "Cappuccino",
        "description": "Equal parts rich espresso, steamed milk, and dense micro-foam dusted with cocoa powder.",
        "image": "https://images.unsplash.com/photo-1534778101976-62847782c213?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.50,
        "is_available": True,
    },
    {
        "category_name": "Coffee",
        "name": "Caramel Macchiato",
        "description": "Vanilla-infused milk stained with dark espresso and drizzled with buttery salted caramel.",
        "image": "https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.25,
        "is_available": True,
    },
    {
        "category_name": "Coffee",
        "name": "Spanish Latte",
        "description": "Sweetened condensed milk blended with fresh espresso and cold milk for a decadent kick.",
        "image": "https://images.unsplash.com/photo-1541167760496-1628856ab772?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.00,
        "is_available": True,
    },

    # --- Milk Tea ---
    {
        "category_name": "Milk Tea",
        "name": "Classic Milk Tea",
        "description": "Traditional robust black tea slow-brewed and blended with creamy milk.",
        "image": "https://images.unsplash.com/photo-1558857563-b37cf5a1334c?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.50,
        "is_available": True,
    },
    {
        "category_name": "Milk Tea",
        "name": "Brown Sugar Boba Milk Tea",
        "description": "Warm caramelized tapioca pearls swirled with dark brown sugar syrup and cold milk.",
        "image": "https://images.unsplash.com/photo-1579954115545-a95591f28bfc?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.25,
        "is_available": True,
    },
    {
        "category_name": "Milk Tea",
        "name": "Taro Milk Tea",
        "description": "Sweet, nutty taro root paste infused with jasmine green tea and creamy milk.",
        "image": "https://images.unsplash.com/photo-1563227812-0ea4c22e6cc8?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.75,
        "is_available": True,
    },
    {
        "category_name": "Milk Tea",
        "name": "Matcha Milk Tea",
        "description": "Whisked green tea powder paired with creamy milk and lightly sweetened honey syrup.",
        "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.00,
        "is_available": True,
    },
    {
        "category_name": "Milk Tea",
        "name": "Thai Milk Tea",
        "description": "Aromatic star anise and orange blossom Ceylon tea sweetened with evaporated and condensed milk.",
        "image": "https://images.unsplash.com/photo-1594631252845-29fc4cc8cde9?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.50,
        "is_available": True,
    },

    # --- Fruit Tea ---
    {
        "category_name": "Fruit Tea",
        "name": "Passion Fruit Tea",
        "description": "Real passion fruit juice with seeds steeped in iced jasmine green tea with mint.",
        "image": "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.50,
        "is_available": True,
    },
    {
        "category_name": "Fruit Tea",
        "name": "Fresh Lemon Tea",
        "description": "Freshly sliced tart lemons muddled into iced Earl Grey black tea for a thirst-quenching zest.",
        "image": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.00,
        "is_available": True,
    },
    {
        "category_name": "Fruit Tea",
        "name": "Peach Oolong Tea",
        "description": "Sweet white peach puree paired with lightly roasted high-mountain oolong tea.",
        "image": "https://images.unsplash.com/photo-1597481499750-3e6b22637e12?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.75,
        "is_available": True,
    },
    {
        "category_name": "Fruit Tea",
        "name": "Lychee Rose Green Tea",
        "description": "Sweet lychee fruit and aromatic rose petals cold-infused in light green tea.",
        "image": "https://images.unsplash.com/photo-1497534446932-c925b458314e?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 2.75,
        "is_available": True,
    },

    # --- Smoothies ---
    {
        "category_name": "Smoothies",
        "name": "Mango Coconut Smoothie",
        "description": "Ripe golden mango chunks blended with thick coconut cream and crushed ice.",
        "image": "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.50,
        "is_available": True,
    },
    {
        "category_name": "Smoothies",
        "name": "Strawberry Banana Smoothie",
        "description": "Farm-fresh ripe strawberries and sweet banana blended with Greek yogurt.",
        "image": "https://images.unsplash.com/photo-1553530666-ba11a7da3888?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.25,
        "is_available": True,
    },
    {
        "category_name": "Smoothies",
        "name": "Avocado Coffee Frappe",
        "description": "Creamy Hass avocado pureed with sweetened milk and capped with a fresh espresso shot.",
        "image": "https://images.unsplash.com/photo-1577805947697-89e18249d767?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.75,
        "is_available": True,
    },

    # --- Matcha ---
    {
        "category_name": "Matcha",
        "name": "Iced Matcha Latte",
        "description": "Ceremonial Uji matcha whisked fresh and poured over cold oat milk.",
        "image": "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.25,
        "is_available": True,
    },
    {
        "category_name": "Matcha",
        "name": "Dirty Matcha",
        "description": "A striking two-tone blend of vibrant iced matcha latte crowned with a rich espresso shot.",
        "image": "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.50,
        "is_available": True,
    },
    {
        "category_name": "Matcha",
        "name": "Strawberry Matcha Latte",
        "description": "Housemade fresh strawberry compote layered with cold milk and vibrant green matcha.",
        "image": "https://images.unsplash.com/photo-1571934811356-5cc061b6821f?w=600&auto=format&fit=crop&q=80",
        "base_price_usd": 3.50,
        "is_available": True,
    },
]

def seed_database(db: Session) -> dict:
    """
    Safely seeds or updates categories and products.
    Idempotent: running this multiple times will never duplicate items.
    """
    category_map = {}
    categories_added = 0
    categories_updated = 0

    # 1. Upsert Categories
    for cat_data in SEED_CATEGORIES:
        cat = db.query(Category).filter(Category.name == cat_data["name"]).first()
        if not cat:
            cat = Category(**cat_data)
            db.add(cat)
            db.flush()
            categories_added += 1
        else:
            cat.description = cat_data["description"]
            cat.image = cat_data["image"]
            cat.is_active = cat_data["is_active"]
            categories_updated += 1
        category_map[cat.name] = cat.id

    db.commit()

    # 2. Upsert Products
    products_added = 0
    products_updated = 0

    for prod_data in SEED_PRODUCTS:
        cat_name = prod_data["category_name"]
        cat_id = category_map.get(cat_name)
        if not cat_id:
            continue

        prod = db.query(Product).filter(Product.name == prod_data["name"]).first()
        if not prod:
            prod = Product(
                category_id=cat_id,
                name=prod_data["name"],
                description=prod_data["description"],
                image=prod_data["image"],
                base_price_usd=prod_data["base_price_usd"],
                is_available=prod_data["is_available"],
            )
            db.add(prod)
            products_added += 1
        else:
            prod.category_id = cat_id
            prod.description = prod_data["description"]
            prod.image = prod_data["image"]
            prod.base_price_usd = prod_data["base_price_usd"]
            prod.is_available = prod_data["is_available"]
            products_updated += 1

    db.commit()

    return {
        "categories_added": categories_added,
        "categories_updated": categories_updated,
        "products_added": products_added,
        "products_updated": products_updated,
        "total_categories": db.query(Category).count(),
        "total_products": db.query(Product).count(),
    }

