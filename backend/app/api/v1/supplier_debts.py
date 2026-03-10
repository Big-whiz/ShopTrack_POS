from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from app.db.session import get_db
from app.models.supplier_debt import SupplierDebt
from app.models.supplier import Supplier
from app.schemas.supplier_debt import SupplierDebt as SupplierDebtSchema, SupplierDebtCreate, SupplierDebtUpdate
from app.core.security import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[SupplierDebtSchema])
def list_supplier_debts(
    supplier_id: Optional[int] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(SupplierDebt).options(
        joinedload(SupplierDebt.supplier),
        joinedload(SupplierDebt.responsible_staff)
    )
    if supplier_id:
        query = query.filter(SupplierDebt.supplier_id == supplier_id)
    if status:
        query = query.filter(SupplierDebt.status == status)
    
    return query.order_by(SupplierDebt.date_incurred.desc()).all()

@router.post("/", response_model=SupplierDebtSchema)
def create_supplier_debt(
    debt_in: SupplierDebtCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify supplier exists
    supplier = db.query(Supplier).filter(Supplier.id == debt_in.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    debt = SupplierDebt(
        **debt_in.model_dump(),
        responsible_staff_id=current_user.id
    )
    
    # Auto-calculate status if needed, or rely on input
    if debt.amount_paid >= debt.amount_owed:
        debt.status = "Paid"
    elif debt.amount_paid > 0:
        debt.status = "Partial"
    else:
        debt.status = "Unpaid"

    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt

@router.put("/{debt_id}", response_model=SupplierDebtSchema)
def update_supplier_debt(
    debt_id: int,
    debt_in: SupplierDebtUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    debt = db.query(SupplierDebt).filter(SupplierDebt.id == debt_id).first()
    if not debt:
        raise HTTPException(status_code=404, detail="Debt record not found")
    
    update_data = debt_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(debt, field, value)
    
    # Recalculate status
    if debt.amount_paid >= debt.amount_owed:
        debt.status = "Paid"
    elif debt.amount_paid > 0:
        debt.status = "Partial"
    else:
        debt.status = "Unpaid"

    db.add(debt)
    db.commit()
    db.refresh(debt)
    return debt
