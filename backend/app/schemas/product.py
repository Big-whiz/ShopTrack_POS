from pydantic import BaseModel
from typing import Optional
from decimal import Decimal
from app.schemas.category import CategoryOut


class ProductBase(BaseModel):
    sku: str
    name: str
    description: Optional[str] = None
    category_id: Optional[int] = None
    cost_price: Decimal
    selling_price: Decimal
    current_stock: int = 0
    reorder_level: int = 5


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category_id: Optional[int] = None
    cost_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    current_stock: Optional[int] = None
    reorder_level: Optional[int] = None
    is_active: Optional[bool] = None


class ProductOut(ProductBase):
    id: int
    is_active: bool
    category: Optional[CategoryOut] = None

    model_config = {"from_attributes": True}
