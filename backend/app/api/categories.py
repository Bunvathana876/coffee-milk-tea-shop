from typing import List
from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.category import CategoryResponse, CategoryDetailResponse
from app.services import category_service

router = APIRouter(prefix="/categories", tags=["Categories"])

@router.get("", response_model=List[CategoryResponse], summary="List all categories")
def get_categories(
    active_only: bool = Query(True, description="Filter only active categories"),
    db: Session = Depends(get_db),
):
    """
    Retrieve all drink categories with their total product counts.
    - **active_only**: Filter out inactive categories (defaults to true).
    """
    return category_service.get_categories(db, active_only=active_only)

@router.get(
    "/{category_id}", 
    response_model=CategoryDetailResponse,
    summary="Get category by ID",
    responses={404: {"description": "Category not found"}},
)
def get_category_by_id(
    category_id: int = Path(..., ge=1, description="The positive integer ID of the category"),
    db: Session = Depends(get_db),
):
    """
    Retrieve a specific category along with its associated products.
    Returns 404 if the category does not exist.
    """
    category = category_service.get_category_by_id(db, category_id=category_id)
    if not category:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Category with ID {category_id} was not found.",
        )
    return category
