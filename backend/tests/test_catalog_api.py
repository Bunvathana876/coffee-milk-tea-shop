from fastapi.testclient import TestClient
from app.main import app
from app.db.init_db import init_db

client = TestClient(app)

def setup_module():
    """Ensure database tables and seed data are ready before running tests."""
    init_db()

# --- Categories API Tests ---

def test_get_categories():
    """Test GET /api/categories returns seeded categories with product counts."""
    response = client.get("/api/categories")
    assert response.status_code == 200
    categories = response.json()
    assert len(categories) >= 5

    cat_names = [c["name"] for c in categories]
    assert "Coffee" in cat_names
    assert "Milk Tea" in cat_names
    assert "Fruit Tea" in cat_names
    assert "Smoothies" in cat_names
    assert "Matcha" in cat_names

    for c in categories:
        assert "id" in c
        assert "name" in c
        assert "product_count" in c
        assert c["product_count"] >= 0

def test_get_single_category_success():
    """Test GET /api/categories/{id} returns category with embedded products."""
    response = client.get("/api/categories/1")
    assert response.status_code == 200
    cat = response.json()
    assert cat["id"] == 1
    assert cat["name"] == "Coffee"
    assert "products" in cat
    assert len(cat["products"]) > 0
    assert "name" in cat["products"][0]
    assert "base_price_usd" in cat["products"][0]

def test_get_single_category_not_found():
    """Test GET /api/categories/{id} returns 404 for nonexistent category."""
    response = client.get("/api/categories/999999")
    assert response.status_code == 404
    error = response.json()
    assert "detail" in error
    assert "not found" in error["detail"].lower()

def test_get_category_invalid_id_validation():
    """Test GET /api/categories/0 returns 422 validation error."""
    response = client.get("/api/categories/0")
    assert response.status_code == 422

# --- Products API Tests ---

def test_get_products():
    """Test GET /api/products returns all products with category info."""
    response = client.get("/api/products")
    assert response.status_code == 200
    products = response.json()
    assert len(products) >= 15

    p1 = products[0]
    assert "id" in p1
    assert "name" in p1
    assert "base_price_usd" in p1
    assert "category_id" in p1
    assert "category_name" in p1
    assert p1["is_available"] is True

def test_get_products_filter_by_category_name():
    """Test GET /api/products?category=Matcha filters specifically for Matcha drinks."""
    response = client.get("/api/products?category=Matcha")
    assert response.status_code == 200
    products = response.json()
    assert len(products) >= 3
    for p in products:
        assert p["category_name"] == "Matcha"

def test_get_products_filter_by_category_id():
    """Test GET /api/products?category_id=1 returns only products for Coffee category."""
    response = client.get("/api/products?category_id=1")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    for p in products:
        assert p["category_id"] == 1

def test_get_products_search_latte():
    """Test GET /api/products?search=latte searches drinks matching 'latte'."""
    response = client.get("/api/products?search=latte")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    for p in products:
        assert "latte" in p["name"].lower() or "latte" in (p["description"] or "").lower()

def test_get_products_multi_filter():
    """Test GET /api/products?category_id=1&search=latte combines category and search."""
    response = client.get("/api/products?category_id=1&search=latte")
    assert response.status_code == 200
    products = response.json()
    assert len(products) > 0
    for p in products:
        assert p["category_id"] == 1
        assert "latte" in p["name"].lower()

def test_get_products_availability_filter():
    """Test GET /api/products?is_available=true filters by availability."""
    response = client.get("/api/products?is_available=true")
    assert response.status_code == 200
    products = response.json()
    for p in products:
        assert p["is_available"] is True

def test_get_single_product_success():
    """Test GET /api/products/{id} returns single product details."""
    response = client.get("/api/products/1")
    assert response.status_code == 200
    product = response.json()
    assert product["id"] == 1
    assert "name" in product
    assert "category_name" in product

def test_get_single_product_not_found():
    """Test GET /api/products/{id} returns 404 for nonexistent product ID."""
    response = client.get("/api/products/999999")
    assert response.status_code == 404
    error = response.json()
    assert "detail" in error
    assert "not found" in error["detail"].lower()

def test_get_product_invalid_id_validation():
    """Test GET /api/products/0 returns 422 validation error."""
    response = client.get("/api/products/0")
    assert response.status_code == 422
