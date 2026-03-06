from pydantic import BaseModel, model_validator
from typing import List, Optional
from decimal import Decimal
from datetime import datetime


class SaleItemIn(BaseModel):
    product_id: int
    quantity: int


class SaleItemOut(BaseModel):
    id: int
    product_id: int
    product_name: Optional[str] = None
    quantity: int
    unit_price: Decimal
    subtotal: Decimal

    model_config = {"from_attributes": True}


VALID_METHODS = {"Cash", "Mobile Money", "Split"}


class SaleCreate(BaseModel):
    items: List[SaleItemIn]
    payment_method: str = "Cash"
    tax_amount: Optional[float] = 0.00
    momo_transaction_id: Optional[str] = None   # Required for Mobile Money / Split
    cash_amount: Optional[float] = None          # Required for Split
    momo_amount: Optional[float] = None          # Required for Split

    @model_validator(mode="after")
    def validate_payment(self):
        m = self.payment_method
        if m not in VALID_METHODS:
            raise ValueError(f"payment_method must be one of: {VALID_METHODS}")
        if m in ("Mobile Money", "Split") and not self.momo_transaction_id:
            raise ValueError("momo_transaction_id is required for Mobile Money and Split payments")
        if m == "Split":
            if self.cash_amount is None or self.momo_amount is None:
                raise ValueError("cash_amount and momo_amount are required for Split payments")
        return self


class SaleOut(BaseModel):
    id: int
    sale_date: datetime
    user_id: Optional[int] = None
    total_amount: Decimal
    tax_amount: Decimal
    payment_method: str
    momo_transaction_id: Optional[str] = None
    cash_amount: Optional[Decimal] = None
    momo_amount: Optional[Decimal] = None
    items: List[SaleItemOut] = []

    model_config = {"from_attributes": True}


class SaleOutList(BaseModel):
    id: int
    sale_date: datetime
    total_amount: Decimal
    tax_amount: Decimal
    payment_method: str
    momo_transaction_id: Optional[str] = None
    cash_amount: Optional[Decimal] = None
    momo_amount: Optional[Decimal] = None
    item_count: int

    model_config = {"from_attributes": True}
