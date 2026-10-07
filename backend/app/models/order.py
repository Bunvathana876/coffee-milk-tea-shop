from datetime import datetime
from sqlalchemy import Column, DateTime, Float, Integer, String, func
from sqlalchemy.orm import relationship

from app.db.session import Base

class Order(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    order_number = Column(String(50), unique=True, nullable=False, index=True)
    customer_name = Column(String(100), nullable=False)
    customer_phone = Column(String(50), nullable=False)
    subtotal_usd = Column(Float, nullable=False, default=0.0)
    total_usd = Column(Float, nullable=False, default=0.0)
    total_khr = Column(Float, nullable=False, default=0.0)
    payment_status = Column(String(30), nullable=False, default="pending")  # pending, paid, failed
    order_status = Column(String(30), nullable=False, default="pending")    # pending, preparing, completed, cancelled
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationship to OrderItem (1 Order -> Many OrderItems)
    # If an order is deleted, all its items are automatically deleted
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Order(id={self.id}, number='{self.order_number}', total=${self.total_usd:.2f})>"

