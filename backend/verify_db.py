"""Quick verification script to inspect the SQLite database schema and rows."""
from sqlalchemy import inspect
from app.db.session import engine, SessionLocal
from app.db.init_db import init_db
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order
from app.models.order_item import OrderItem

def main():
    print("=" * 60)
    print("  ☕ Brew & Boba - SQLite Database Verification")
    print("=" * 60)

    # 1. Initialize tables (if not already done)
    init_db()

    # 2. Inspect created tables
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    print(f"\n📦 Found {len(tables)} Database Tables:")
    for t in tables:
        columns = inspector.get_columns(t)
        col_names = [f"{c['name']} ({c['type']})" for c in columns]
        print(f"  • {t}:")
        print(f"      Columns: {', '.join(col_names)}")

    # 3. Query current rows
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        products = db.query(Product).all()
        orders = db.query(Order).all()
        order_items = db.query(OrderItem).all()

        print(f"\n📊 Current Data Summary:")
        print(f"  • Categories:  {len(categories)} rows")
        for cat in categories:
            print(f"      - [{cat.id}] {cat.name} ({len(cat.products)} drinks)")

        print(f"  • Products:    {len(products)} rows")
        for p in products:
            print(f"      - [{p.id}] {p.name} (${p.base_price_usd:.2f}) -> Category: {p.category.name if p.category else 'None'}")

        print(f"  • Orders:      {len(orders)} rows")
        print(f"  • Order Items: {len(order_items)} rows")

    finally:
        db.close()

    print("\n✅ All database models and tables are verified and working!\n")

if __name__ == "__main__":
    main()

