from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date

from app.db.session import get_db
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.schemas.sale import SaleCreate, SaleOut
from app.core.security import get_current_user

router = APIRouter()


@router.post("/", response_model=SaleOut, status_code=201)
def create_sale(payload: SaleCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if not payload.items:
        raise HTTPException(status_code=400, detail="Sale must have at least one item")

    total_amount = 0
    sale_items = []

    for item_in in payload.items:
        product = db.query(Product).filter(Product.id == item_in.product_id, Product.is_active == True).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product ID {item_in.product_id} not found")
        if product.current_stock < item_in.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"Insufficient stock for '{product.name}'. Available: {product.current_stock}",
            )

        subtotal = float(product.selling_price) * item_in.quantity
        total_amount += subtotal
        sale_items.append(
            SaleItem(
                product_id=product.id,
                quantity=item_in.quantity,
                unit_price=product.selling_price,
                subtotal=subtotal,
            )
        )
        # Deduct stock atomically
        product.current_stock -= item_in.quantity

    total_amount = round(total_amount + (payload.tax_amount or 0.00), 2)

    # Validate split amounts sum to total
    if payload.payment_method == "Split":
        split_sum = round((payload.cash_amount or 0) + (payload.momo_amount or 0), 2)
        if abs(split_sum - total_amount) > 0.01:
            raise HTTPException(
                status_code=400,
                detail=f"Split amounts (GH₵ {split_sum:.2f}) must equal total (GH₵ {total_amount:.2f})"
            )

    sale = Sale(
        user_id=current_user.id,
        total_amount=total_amount,
        tax_amount=payload.tax_amount or 0.00,
        payment_method=payload.payment_method,
        momo_transaction_id=payload.momo_transaction_id,
        cash_amount=payload.cash_amount if payload.payment_method == "Split" else None,
        momo_amount=payload.momo_amount if payload.payment_method == "Split" else None,
        items=sale_items,
    )
    db.add(sale)
    db.commit()
    db.refresh(sale)

    return _build_sale_out(sale)


@router.get("/", response_model=List[dict])
def list_sales(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    _=Depends(get_current_user),
):
    q = db.query(Sale)
    if start_date:
        q = q.filter(Sale.sale_date >= start_date)
    if end_date:
        from datetime import datetime, time
        q = q.filter(Sale.sale_date <= datetime.combine(end_date, time.max))
    sales = q.order_by(Sale.sale_date.desc()).offset(skip).limit(limit).all()

    return [
        {
            "id": s.id,
            "sale_date": s.sale_date,
            "total_amount": float(s.total_amount),
            "tax_amount": float(s.tax_amount),
            "payment_method": s.payment_method,
            "momo_transaction_id": s.momo_transaction_id,
            "cash_amount": float(s.cash_amount) if s.cash_amount else None,
            "momo_amount": float(s.momo_amount) if s.momo_amount else None,
            "item_count": len(s.items),
            "cashier": s.user.username if s.user else "N/A",
        }
        for s in sales
    ]


@router.get("/{sale_id}", response_model=SaleOut)
def get_sale(sale_id: int, db: Session = Depends(get_db), _=Depends(get_current_user)):
    sale = db.query(Sale).options(joinedload(Sale.items)).filter(Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return _build_sale_out(sale)


def _build_sale_out(sale: Sale) -> SaleOut:
    items_out = [
        {
            "id": si.id,
            "product_id": si.product_id,
            "product_name": si.product.name if si.product else "Deleted Product",
            "quantity": si.quantity,
            "unit_price": si.unit_price,
            "subtotal": si.subtotal,
        }
        for si in sale.items
    ]
    return SaleOut(
        id=sale.id,
        sale_date=sale.sale_date,
        user_id=sale.user_id,
        total_amount=sale.total_amount,
        tax_amount=sale.tax_amount,
        payment_method=sale.payment_method,
        momo_transaction_id=sale.momo_transaction_id,
        cash_amount=sale.cash_amount,
        momo_amount=sale.momo_amount,
        items=items_out,
    )
