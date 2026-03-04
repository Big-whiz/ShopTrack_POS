from pydantic import BaseModel
from typing import Optional, List
from decimal import Decimal
from datetime import date, datetime


class CreditCreate(BaseModel):
    creditor_name: str
    items_description: str
    total_amount: float
    due_date: Optional[date] = None
    notes: Optional[str] = None


class CreditUpdate(BaseModel):
    creditor_name: Optional[str] = None
    items_description: Optional[str] = None
    total_amount: Optional[float] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None
    is_paid: Optional[bool] = None
    paid_date: Optional[date] = None


class CreditOut(BaseModel):
    id: int
    creditor_name: str
    items_description: str
    total_amount: Decimal
    due_date: Optional[date] = None
    is_paid: bool
    paid_date: Optional[date] = None
    notes: Optional[str] = None
    created_by: Optional[int] = None
    creator_name: Optional[str] = None
    created_at: datetime
    is_overdue: bool = False

    model_config = {"from_attributes": True}


class CreditSummary(BaseModel):
    total_outstanding: Decimal
    total_paid: Decimal
    count_outstanding: int
    count_overdue: int
    count_paid: int
