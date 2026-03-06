from sqlalchemy import Column, Integer, String, Numeric, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base_class import Base


class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    total_amount = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    payment_method = Column(String(50), default="Cash")  # Cash | Mobile Money | Split

    # Mobile Money fields
    momo_transaction_id = Column(String(100), nullable=True)  # MoMo reference for full/partial MoMo payments
    # Split payment amounts (only set when payment_method == "Split")
    cash_amount = Column(Numeric(12, 2), nullable=True)
    momo_amount = Column(Numeric(12, 2), nullable=True)

    user = relationship("User", back_populates="sales")
    items = relationship("SaleItem", back_populates="sale", cascade="all, delete-orphan")


class SaleItem(Base):
    __tablename__ = "sale_items"

    id = Column(Integer, primary_key=True, index=True)
    sale_id = Column(Integer, ForeignKey("sales.id"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(12, 2), nullable=False)  # snapshot of price at time of sale
    subtotal = Column(Numeric(12, 2), nullable=False)

    sale = relationship("Sale", back_populates="items")
    product = relationship("Product", back_populates="sale_items")
