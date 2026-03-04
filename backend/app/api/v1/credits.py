from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date

from app.db.session import get_db
from app.models.credit import Credit
from app.schemas.credit import CreditCreate, CreditUpdate, CreditOut, CreditSummary
from app.core.security import get_current_user

router = APIRouter()


def _build_credit_out(c: Credit) -> CreditOut:
    today = date.today()
    is_overdue = (
        not c.is_paid and
        c.due_date is not None and
        c.due_date < today
    )
    return CreditOut(
        id=c.id,
        creditor_name=c.creditor_name,
        items_description=c.items_description,
        total_amount=c.total_amount,
        due_date=c.due_date,
        is_paid=c.is_paid,
        paid_date=c.paid_date,
        notes=c.notes,
        created_by=c.created_by,
        creator_name=c.creator.username if c.creator else None,
        created_at=c.created_at,
        is_overdue=is_overdue,
    )


@router.post("/", response_model=CreditOut, status_code=201)
def create_credit(
    payload: CreditCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    credit = Credit(
        creditor_name=payload.creditor_name.strip(),
        items_description=payload.items_description.strip(),
        total_amount=payload.total_amount,
        due_date=payload.due_date,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(credit)
    db.commit()
    db.refresh(credit)
    return _build_credit_out(credit)


@router.get("/summary", response_model=CreditSummary)
def get_credit_summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    all_credits = db.query(Credit).all()
    today = date.today()
    outstanding = [c for c in all_credits if not c.is_paid]
    paid = [c for c in all_credits if c.is_paid]
    overdue = [c for c in outstanding if c.due_date and c.due_date < today]
    return CreditSummary(
        total_outstanding=sum(float(c.total_amount) for c in outstanding),
        total_paid=sum(float(c.total_amount) for c in paid),
        count_outstanding=len(outstanding),
        count_overdue=len(overdue),
        count_paid=len(paid),
    )


@router.get("/", response_model=List[CreditOut])
def list_credits(
    is_paid: Optional[bool] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Credit)
    if is_paid is not None:
        q = q.filter(Credit.is_paid == is_paid)
    if search:
        q = q.filter(Credit.creditor_name.ilike(f"%{search}%"))
    credits = q.order_by(Credit.is_paid.asc(), Credit.due_date.asc().nullslast(), Credit.created_at.desc()).offset(skip).limit(limit).all()
    return [_build_credit_out(c) for c in credits]


@router.get("/{credit_id}", response_model=CreditOut)
def get_credit(credit_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    c = db.query(Credit).filter(Credit.id == credit_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Credit record not found")
    return _build_credit_out(c)


@router.put("/{credit_id}", response_model=CreditOut)
def update_credit(
    credit_id: int,
    payload: CreditUpdate,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    c = db.query(Credit).filter(Credit.id == credit_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Credit record not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(c, field, value)
    # Auto-set paid_date when marking as paid
    if payload.is_paid is True and not c.paid_date:
        c.paid_date = date.today()
    if payload.is_paid is False:
        c.paid_date = None
    db.commit()
    db.refresh(c)
    return _build_credit_out(c)


@router.delete("/{credit_id}", status_code=204)
def delete_credit(
    credit_id: int,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    c = db.query(Credit).filter(Credit.id == credit_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Credit record not found")
    db.delete(c)
    db.commit()
