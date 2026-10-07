from typing import List, Optional
from sqlalchemy.orm import Session, joinedload
from app.models.category import Category

def get_categories(db: Session, active_only: bool = True) -> List[Category]:
    """Retrieve all categories with their associated products for accurate counts."""
    query = db.query(Category).options(joinedload(Category.products))
    if active_only:
        query = query.filter(Category.is_active.is_(True))
    return query.order_by(Category.id.asc()).all()

def get_category_by_id(db: Session, category_id: int) -> Optional[Category]:
    """Retrieve a single category by its ID along with its products."""
    return (
        db.query(Category)
        .options(joinedload(Category.products))
        .filter(Category.id == category_id)
        .first()
    )

