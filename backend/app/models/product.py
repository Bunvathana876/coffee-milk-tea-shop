from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.db.session import Base

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    category_id = Column(
        Integer, 
        ForeignKey("categories.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    name = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=True)
    image = Column(String(255), nullable=True)
    base_price_usd = Column(Float, nullable=False)
    is_available = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    category = relationship("Category", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

    @property
    def category_name(self) -> str | None:
        return self.category.name if self.category else None

    def __repr__(self) -> str:
        return f"<Product(id={self.id}, name='{self.name}', price=${self.base_price_usd:.2f})>"


