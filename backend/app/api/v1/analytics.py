from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, text
from datetime import date, datetime, timedelta

from app.db.session import get_db
from app.models.sale import Sale, SaleItem
from app.models.product import Product
from app.core.security import require_admin, get_current_user

router = APIRouter()


@router.get("/dashboard")
def dashboard_summary(db: Session = Depends(get_db), _=Depends(get_current_user)):
    today = date.today()
    start_of_day = datetime(today.year, today.month, today.day)
    start_of_month = datetime(today.year, today.month, 1)
    # Start of Monday at 00:00:00 so we don't miss same-day sales
    today_dt = datetime.now()
    start_of_week = datetime(today_dt.year, today_dt.month, today_dt.day) - timedelta(days=today_dt.weekday())

    def revenue_in_range(start, end=None):
        q = db.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(Sale.sale_date >= start)
        if end:
            q = q.filter(Sale.sale_date < end)
        return float(q.scalar())

    daily_revenue = revenue_in_range(start_of_day)
    weekly_revenue = revenue_in_range(start_of_week)
    monthly_revenue = revenue_in_range(start_of_month)
    total_sales_today = db.query(func.count(Sale.id)).filter(Sale.sale_date >= start_of_day).scalar()
    total_products = db.query(func.count(Product.id)).filter(Product.is_active == True).scalar()
    low_stock_count = (
        db.query(func.count(Product.id))
        .filter(Product.is_active == True, Product.current_stock <= Product.reorder_level)
        .scalar()
    )

    return {
        "daily_revenue": daily_revenue,
        "weekly_revenue": weekly_revenue,
        "monthly_revenue": monthly_revenue,
        "total_sales_today": total_sales_today,
        "total_products": total_products,
        "low_stock_count": low_stock_count,
    }


@router.get("/top-products")
def top_products(limit: int = 10, db: Session = Depends(get_db), _=Depends(require_admin)):
    results = (
        db.query(Product.name, func.sum(SaleItem.quantity).label("total_sold"))
        .join(SaleItem, SaleItem.product_id == Product.id)
        .group_by(Product.name)
        .order_by(func.sum(SaleItem.quantity).desc())
        .limit(limit)
        .all()
    )
    return [{"name": r.name, "total_sold": int(r.total_sold)} for r in results]


@router.get("/revenue-trend")
def revenue_trend(days: int = 30, db: Session = Depends(get_db), _=Depends(require_admin)):
    start = datetime.now() - timedelta(days=days)
    results = (
        db.query(
            func.date(Sale.sale_date).label("day"),
            func.sum(Sale.total_amount).label("revenue"),
            func.count(Sale.id).label("transactions"),
        )
        .filter(Sale.sale_date >= start)
        .group_by(func.date(Sale.sale_date))
        .order_by(func.date(Sale.sale_date))
        .all()
    )
    return [
        {"day": str(r.day), "revenue": float(r.revenue), "transactions": int(r.transactions)}
        for r in results
    ]


@router.get("/profit-analysis")
def profit_analysis(months: int = 6, db: Session = Depends(get_db), _=Depends(require_admin)):
    # Build INTERVAL directly — you cannot bind a parameter inside a quoted INTERVAL string
    results = db.execute(
        text(f"""
            SELECT
                DATE_TRUNC('month', s.sale_date) AS month,
                SUM(si.subtotal)::float AS total_revenue,
                SUM(si.quantity * p.cost_price)::float AS total_cost
            FROM sales s
            JOIN sale_items si ON s.id = si.sale_id
            JOIN products p ON si.product_id = p.id
            WHERE s.sale_date >= NOW() - INTERVAL '{int(months)} months'
            GROUP BY month
            ORDER BY month DESC
        """)
    ).fetchall()

    return [
        {
            "month": str(r.month),
            "revenue": r.total_revenue,
            "cost": r.total_cost,
            "profit": round(r.total_revenue - r.total_cost, 2),
        }
        for r in results
    ]


@router.get("/payment-methods")
def payment_method_breakdown(db: Session = Depends(get_db), _=Depends(require_admin)):
    results = (
        db.query(Sale.payment_method, func.count(Sale.id).label("count"), func.sum(Sale.total_amount).label("total"))
        .group_by(Sale.payment_method)
        .all()
    )
    return [{"method": r.payment_method, "count": r.count, "total": float(r.total)} for r in results]
