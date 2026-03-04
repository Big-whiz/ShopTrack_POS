// ============================================================
// Central TypeScript type definitions for ShopTrack POS
// ============================================================

export interface User {
    id: number;
    username: string;
    full_name: string | null;
    role: 'admin' | 'staff';
    is_active: boolean;
    created_at: string;
}

export interface Category {
    id: number;
    name: string;
    description: string | null;
}

export interface Product {
    id: number;
    sku: string;
    name: string;
    description: string | null;
    category_id: number | null;
    category: Category | null;
    cost_price: number;
    selling_price: number;
    current_stock: number;
    reorder_level: number;
    is_active: boolean;
}

export interface SaleItem {
    id: number;
    product_id: number;
    product_name: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
}

export interface Sale {
    id: number;
    sale_date: string;
    user_id: number | null;
    total_amount: number;
    payment_method: string;
    items: SaleItem[];
}

export interface SaleListItem {
    id: number;
    sale_date: string;
    total_amount: number;
    payment_method: string;
    item_count: number;
    cashier: string;
}

export interface DashboardSummary {
    daily_revenue: number;
    weekly_revenue: number;
    monthly_revenue: number;
    total_sales_today: number;
    total_products: number;
    low_stock_count: number;
}

export interface TopProduct {
    name: string;
    total_sold: number;
}

export interface RevenueTrend {
    day: string;
    revenue: number;
    transactions: number;
}

export interface ProfitMonthly {
    month: string;
    revenue: number;
    cost: number;
    profit: number;
}

export interface CartItem {
    product: Product;
    quantity: number;
}

export interface Credit {
    id: number;
    creditor_name: string;
    items_description: string;
    total_amount: number;
    due_date: string | null;
    is_paid: boolean;
    paid_date: string | null;
    notes: string | null;
    created_by: number | null;
    creator_name: string | null;
    created_at: string;
    is_overdue: boolean;
}

export interface CreditSummary {
    total_outstanding: number;
    total_paid: number;
    count_outstanding: number;
    count_overdue: number;
    count_paid: number;
}
