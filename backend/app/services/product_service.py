from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.category import Category
from app.models.product import Product

def get_products(
    db: Session,
    category_id: Optional[int] = None,
    category_name: Optional[str] = None,
    search: Optional[str] = None,
    is_available: Optional[bool] = True,
) -> List[Product]:
    """
    Retrieve products filtered by category, search term, and availability.
    Eagerly loads the related category to avoid N+1 query problems.
    """
    query = db.query(Product).options(joinedload(Product.category))

    # Availability filter
    if is_available is not None:
        query = query.filter(Product.is_available.is_(is_available))

    # Category ID filter
    if category_id is not None:
        query = query.filter(Product.category_id == category_id)

    # Category Name filter (case-insensitive)
    if category_name is not None and category_name.strip():
        term = category_name.strip().lower()
        query = query.join(Product.category).filter(
            Category.name.ilike(f"%{term}%")
        )

    # Search filter by name or description
    if search is not None and search.strip():
        term = f"%{search.strip()}%"
        query = query.filter(
            (Product.name.ilike(term)) | (Product.description.ilike(term))
        )

    return query.order_by(Product.category_id.asc(), Product.id.asc()).all()

def get_product_by_id(db: Session, product_id: int) -> Optional[Product]:
    """Retrieve a single product by ID with eager loaded category."""
    return (
        db.query(Product)
        .options(joinedload(Product.category))
        .filter(Product.id == product_id)
        .first()
    )

