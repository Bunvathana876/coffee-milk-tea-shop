from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Category name, e.g. Coffee, Milk Tea")
    description: Optional[str] = Field(None, description="Description of the category")
    image: Optional[str] = Field(None, description="Image URL representing the category")
    is_active: bool = Field(True, description="Whether the category is actively displayed")

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    created_at: datetime
    product_count: Optional[int] = Field(None, description="Total number of products in this category")

    model_config = ConfigDict(from_attributes=True)

class ProductSummary(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    base_price_usd: float
    image: Optional[str] = None
    is_available: bool

    model_config = ConfigDict(from_attributes=True)

class CategoryDetailResponse(CategoryResponse):
    products: List[ProductSummary] = Field(default_factory=list, description="List of products in this category")

    model_config = ConfigDict(from_attributes=True)
