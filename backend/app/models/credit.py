from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base_class import Base


class Credit(Base):
    __tablename__ = "credits"

    id = Column(Integer, primary_key=True, index=True)
    creditor_name = Column(String(200), nullable=False, index=True)
    items_description = Column(Text, nullable=False)   # free-text: what they took
    total_amount = Column(Numeric(12, 2), nullable=False)
    tax_amount = Column(Numeric(12, 2), default=0.00, nullable=False)
    due_date = Column(Date, nullable=True)
    is_paid = Column(Boolean, default=False, nullable=False)
    paid_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)

    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)

    creator = relationship("User", foreign_keys=[created_by])
