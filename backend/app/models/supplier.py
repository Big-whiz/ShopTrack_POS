from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import relationship
from app.db.base_class import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False, index=True)
    contact_person = Column(String(200), nullable=True)
    phone = Column(String(50), nullable=True)
    email = Column(String(100), nullable=True)

    debts = relationship("SupplierDebt", back_populates="supplier")
