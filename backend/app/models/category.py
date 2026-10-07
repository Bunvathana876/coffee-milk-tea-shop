from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, Integer, String, Text, func
from sqlalchemy.orm import relationship

from app.db.session import Base

class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    image = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship to Product (1 Category -> Many Products)
    # If a category is deleted, related products are also deleted (cascade)
    products = relationship("Product", back_populates="category", cascade="all, delete-orphan")

    @property
    def product_count(self) -> int:
        return len(self.products) if self.products else 0

    def __repr__(self) -> str:
        return f"<Category(id={self.id}, name='{self.name}', is_active={self.is_active})>"


