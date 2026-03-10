from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
from app.schemas.supplier import Supplier
from app.schemas.user import UserOut

class SupplierDebtBase(BaseModel):
    supplier_id: int
    amount_owed: Decimal
    amount_paid: Decimal = Decimal("0.00")
    status: str = "Unpaid"
    date_incurred: date
    payment_date: Optional[date] = None
    payment_method: Optional[str] = None
    notes: Optional[str] = None

class SupplierDebtCreate(SupplierDebtBase):
    pass

class SupplierDebtUpdate(SupplierDebtBase):
    supplier_id: Optional[int] = None
    amount_owed: Optional[Decimal] = None
    date_incurred: Optional[date] = None

class SupplierDebt(SupplierDebtBase):
    id: int
    responsible_staff_id: Optional[int] = None
    created_at: datetime
    
    supplier: Optional[Supplier] = None
    responsible_staff: Optional[UserOut] = None

    class Config:
        from_attributes = True
