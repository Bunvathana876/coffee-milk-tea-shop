from sqlalchemy import inspect
from app.db.session import Base, SessionLocal, engine
from app.db.init_db import init_db
from app.models.category import Category
from app.models.product import Product
from app.models.order import Order
from app.models.order_item import OrderItem

def test_database_tables_exist():
    """Verify that all four required tables are created in SQLite."""
    init_db()
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    assert "categories" in table_names
    assert "products" in table_names
    assert "orders" in table_names
    assert "order_items" in table_names

def test_category_and_product_relationship():
    """Verify Category to Product 1-to-many relationship and foreign key cascade."""
    init_db()
    db = SessionLocal()
    try:
        # Create a test category
        cat = Category(
            name="Seasonal Specials",
            description="Limited time drinks",
            is_active=True,
        )
        db.add(cat)
        db.commit()
        db.refresh(cat)

        # Create products under this category
        p1 = Product(
            category_id=cat.id,
            name="Matcha Strawberry Cloud",
            base_price_usd=3.50,
            is_available=True,
        )
        p2 = Product(
            category_id=cat.id,
            name="Taro Milk Tea",
            base_price_usd=3.25,
            is_available=True,
        )
        db.add_all([p1, p2])
        db.commit()

        # Check relationships
        db.refresh(cat)
        assert len(cat.products) >= 2
        product_names = [p.name for p in cat.products]
        assert "Matcha Strawberry Cloud" in product_names
        assert "Taro Milk Tea" in product_names

        # Verify back_populates
        assert p1.category.name == "Seasonal Specials"

        # Clean up test category (cascades to test products)
        db.delete(cat)
        db.commit()

        # Check cascade delete
        deleted_p = db.query(Product).filter(Product.name == "Matcha Strawberry Cloud").first()
        assert deleted_p is None
    finally:
        db.close()

def test_order_and_order_item_relationship():
    """Verify Order to OrderItem 1-to-many relationship and calculation fields."""
    init_db()
    db = SessionLocal()
    try:
        order = Order(
            order_number="ORD-TEST-001",
            customer_name="Sokha Lim",
            customer_phone="012345678",
            subtotal_usd=6.50,
            total_usd=6.50,
            total_khr=26650.0,
            payment_status="pending",
            order_status="pending",
        )
        db.add(order)
        db.commit()
        db.refresh(order)

        item1 = OrderItem(
            order_id=order.id,
            product_name="Classic Iced Latte",
            quantity=1,
            unit_price_usd=2.50,
            subtotal_usd=2.50,
            size="Regular",
            sugar_level="50%",
            ice_level="Normal",
        )
        item2 = OrderItem(
            order_id=order.id,
            product_name="Brown Sugar Boba",
            quantity=1,
            unit_price_usd=4.00,
            subtotal_usd=4.00,
            size="Large",
            sugar_level="70%",
            ice_level="Less Ice",
        )
        db.add_all([item1, item2])
        db.commit()

        db.refresh(order)
        assert len(order.items) == 2
        assert item1.order.order_number == "ORD-TEST-001"

        # Verify cascade delete
        db.delete(order)
        db.commit()

        items = db.query(OrderItem).filter(OrderItem.order_id == order.id).all()
        assert len(items) == 0
    finally:
        db.close()

