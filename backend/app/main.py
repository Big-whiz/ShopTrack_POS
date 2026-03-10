from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.v1 import auth, users, categories, products, sales, analytics, credits, settings as shop_settings_router, suppliers, supplier_debts

app = FastAPI(
    title="ShopTrack POS API",
    description="Inventory and Sales Management System for Retail",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === API Routers ===
PREFIX = "/api/v1"

app.include_router(auth.router, prefix=f"{PREFIX}/auth", tags=["Auth"])
app.include_router(users.router, prefix=f"{PREFIX}/users", tags=["Users"])
app.include_router(categories.router, prefix=f"{PREFIX}/categories", tags=["Categories"])
app.include_router(products.router, prefix=f"{PREFIX}/products", tags=["Products"])
app.include_router(sales.router, prefix=f"{PREFIX}/sales", tags=["Sales"])
app.include_router(analytics.router, prefix=f"{PREFIX}/analytics", tags=["Analytics"])
app.include_router(credits.router, prefix=f"{PREFIX}/credits", tags=["Credits"])
app.include_router(shop_settings_router.router, prefix=f"{PREFIX}/settings", tags=["Settings"])
app.include_router(suppliers.router, prefix=f"{PREFIX}/suppliers", tags=["Suppliers"])
app.include_router(supplier_debts.router, prefix=f"{PREFIX}/supplier-debts", tags=["Supplier Debts"])


@app.get("/api/health")
def health():
    return {"status": "ok", "app": "ShopTrack POS", "version": "1.1.0"}
