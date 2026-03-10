from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.db.session import get_db
from app.models.supplier import Supplier
from app.schemas.supplier import Supplier as SupplierSchema, SupplierCreate, SupplierUpdate
from app.core.security import get_current_user, require_admin
from app.models.user import User

router = APIRouter()

@router.get("/", response_model=List[SupplierSchema])
def list_suppliers(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(Supplier).all()

@router.post("/", response_model=SupplierSchema)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = Supplier(**supplier_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.put("/{supplier_id}", response_model=SupplierSchema)
def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    update_data = supplier_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(supplier, field, value)
    
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier

@router.delete("/{supplier_id}")
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)
):
    supplier = db.query(Supplier).filter(Supplier.id == supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    
    db.delete(supplier)
    db.commit()
    return {"detail": "Supplier deleted"}
