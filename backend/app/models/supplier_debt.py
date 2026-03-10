from sqlalchemy import Column, Integer, String, Numeric, Date, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base_class import Base

class SupplierDebt(Base):
    __tablename__ = "supplier_debts"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    
    amount_owed = Column(Numeric(12, 2), nullable=False)
    amount_paid = Column(Numeric(12, 2), default=0.00, nullable=False)
    # Note: outstanding_balance can be calculated as amount_owed - amount_paid
    
    status = Column(String(50), default="Unpaid", nullable=False) # Unpaid, Paid, Partial
    date_incurred = Column(Date, default=lambda: datetime.now(timezone.utc).date(), nullable=False)
    payment_date = Column(Date, nullable=True)
    
    responsible_staff_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    payment_method = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    supplier = relationship("Supplier", back_populates="debts")
    responsible_staff = relationship("User")
