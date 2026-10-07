from sqlalchemy import Column, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship

from app.db.session import Base

class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_id = Column(
        Integer, 
        ForeignKey("orders.id", ondelete="CASCADE"), 
        nullable=False, 
        index=True
    )
    product_id = Column(
        Integer, 
        ForeignKey("products.id", ondelete="SET NULL"), 
        nullable=True, 
        index=True
    )
    product_name = Column(String(100), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)
    unit_price_usd = Column(Float, nullable=False)
    subtotal_usd = Column(Float, nullable=False)
    size = Column(String(20), default="Regular", nullable=False)          # Small, Regular, Large
    sugar_level = Column(String(20), default="100%", nullable=False)     # 0%, 30%, 50%, 70%, 100%
    ice_level = Column(String(20), default="Normal", nullable=False)     # No Ice, Less Ice, Normal

    # Relationships
    order = relationship("Order", back_populates="items")
    product = relationship("Product", back_populates="order_items")

    def __repr__(self) -> str:
        return (
            f"<OrderItem(id={self.id}, name='{self.product_name}', "
            f"qty={self.quantity}, subtotal=${self.subtotal_usd:.2f})>"
        )

