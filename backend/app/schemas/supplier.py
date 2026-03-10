from pydantic import BaseModel, EmailStr
from typing import Optional, List

class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[Optional[EmailStr]] = None

class SupplierCreate(SupplierBase):
    pass

class SupplierUpdate(SupplierBase):
    name: Optional[str] = None

class Supplier(SupplierBase):
    id: int

    class Config:
        from_attributes = True
