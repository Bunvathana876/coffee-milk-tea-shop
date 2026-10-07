from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.category import CategoryResponse

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Product name, e.g. Iced Latte")
    category_id: int = Field(..., ge=1, description="Associated category ID")
    description: Optional[str] = Field(None, description="Product description and ingredients")
    image: Optional[str] = Field(None, description="Image URL of the beverage")
    base_price_usd: float = Field(..., ge=0.0, description="Base price in USD")
    is_available: bool = Field(True, description="Whether the drink is currently in stock/available")

class ProductCreate(ProductBase):
    pass

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    category_name: Optional[str] = Field(None, description="Name of the parent category")
    category: Optional[CategoryResponse] = Field(None, description="Full category details")

    model_config = ConfigDict(from_attributes=True)
