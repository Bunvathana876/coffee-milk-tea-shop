"""Standalone database seeding script for Coffee & Milk Tea catalog."""
from app.db.session import SessionLocal
from app.db.init_db import create_tables
from app.db.seed_data import seed_database
from app.models.category import Category
from app.models.product import Product

def run_seed():
    print("=" * 65)
    print("  ☕ Brew & Boba - Database Seeding System")
    print("=" * 65)

    print("\n1. Ensuring database tables are created...")
    create_tables()

    print("2. Populating categories and drinks (idempotent upsert)...")
    db = SessionLocal()
    try:
        results = seed_database(db)

        print("\n✅ Seeding Results:")
        print(f"  • Categories Added:   {results['categories_added']}")
        print(f"  • Categories Updated: {results['categories_updated']}")
        print(f"  • Products Added:     {results['products_added']}")
        print(f"  • Products Updated:   {results['products_updated']}")
        print(f"  • Total Categories:   {results['total_categories']}")
        print(f"  • Total Products:     {results['total_products']}")

        print("\n📋 Categories & Drinks in Database:")
        categories = db.query(Category).order_by(Category.id.asc()).all()
        for cat in categories:
            print(f"\n📁 [{cat.id}] {cat.name} ({len(cat.products)} drinks)")
            for p in cat.products:
                print(f"    - #{p.id:<2} {p.name:<32} ${p.base_price_usd:.2f}")

    finally:
        db.close()

    print("\n" + "=" * 65)
    print("  Database is ready! Test via Swagger UI: http://localhost:8000/docs")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    run_seed()

