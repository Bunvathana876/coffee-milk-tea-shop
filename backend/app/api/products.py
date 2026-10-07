from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.product import ProductResponse
from app.services import product_service

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse], summary="List all products with filters")
def get_products(
    category_id: Optional[int] = Query(
        None, 
        ge=1, 
        description="Filter products by numeric Category ID (e.g. ?category_id=1)"
    ),
    category: Optional[str] = Query(
        None, 
        description="Filter products by Category name (e.g. ?category=Coffee or ?category=Matcha)"
    ),
    search: Optional[str] = Query(
        None, 
        min_length=1, 
        max_length=100, 
        description="Search products by title or description (e.g. ?search=latte)"
    ),
    is_available: Optional[bool] = Query(
        True, 
        description="Filter by availability status (defaults to true; pass false for sold-out)"
    ),
    db: Session = Depends(get_db),
):
    """
    Retrieve café products with optional filters:
    - **category_id**: Filter by integer Category ID.
    - **category**: Filter by Category name (case-insensitive substring).
    - **search**: Search string in product title or description.
    - **is_available**: Filter by availability flag.
    
    Examples:
    - `GET /api/products?category_id=1`
    - `GET /api/products?search=latte`
    - `GET /api/products?category_id=1&search=milk`
    """
    return product_service.get_products(
        db=db,
        category_id=category_id,
        category_name=category,
        search=search,
        is_available=is_available,
    )

@router.get(
    "/{product_id}", 
    response_model=ProductResponse,
    summary="Get single product by ID",
    responses={404: {"description": "Product not found"}},
)
def get_product_by_id(
    product_id: int = Path(..., ge=1, description="The positive integer ID of the product"),
    db: Session = Depends(get_db),
):
    """
    Retrieve detailed information for a single café product by ID.
    Returns 404 if the product does not exist.
    """
    product = product_service.get_product_by_id(db, product_id=product_id)
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product with ID {product_id} was not found.",
        )
    return product
