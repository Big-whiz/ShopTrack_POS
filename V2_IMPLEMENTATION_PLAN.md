# ShopTrack POS Version 2.0: Implementation Plan

This document outlines the architecture, database schema changes, and step-by-step implementation plan for two major Version 2.0 features: **Multi-Branch Syncing** and **SMS Receipt Integrations**.

---

## 🏗️ Feature 1: Multi-Branch Architecture & Syncing

### Overview
Transitioning from a single-store POS to a multi-branch system requires segmenting data (inventory, users, sales) by branch, while allowing higher-level admin roles to view aggregate data. Since the POS already supports offline mode (via PWA and IndexedDB), multi-branch logic must respect offline resilience by syncing branch-specific transactions to a central cloud database when online.

### 1. Database Schema Additions
To support multi-branch, we will introduce a `ShopBranch` model and link existing models to it.

```python
# models/branch.py
class ShopBranch(Base):
    __tablename__ = "shop_branches"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    location = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
```

**Required Foreign Keys:**
- `User`: Add `branch_id` (so staff exist per branch). Superadmins might have `branch_id=None`.
- `Product`: Add `branch_id` (Inventory is isolated per branch).
- `Sale / Credit`: Add `branch_id` (Revenue tied to specific branches).
- `ShopSettings`: Convert to branch-specific settings or keep one global + branch overrides.

### 2. Authentication & JWT Claims
The JWT payload must be updated to include the user's `branch_id`.
```json
// Example JWT Payload
{
  "sub": "user_id",
  "role": "staff",
  "branch_id": 2, 
  "exp": 1718228181
}
```

### 3. API & Row-Level Security
Update all FastAPI endpoints to filter data based on the user's `branch_id`.
- **Admin at Branch A** can only see Branch A's inventory and sales.
- **Superadmin** can optionally pass a `?branch_id=X` query parameter to view/filter data across the entire organization.

### 4. Frontend Offline Sync Update
- The IndexedDB sync queue in `Dexie.js` must stamp every offline transaction with the current user's `branch_id`.
- When the PWA comes back online, it pushes the `branch_id` payloads sequentially to the centralized backend.

### Plan of Action (Step-by-Step)
1. **[Backend]** Create Alembic migrations to add the `ShopBranch` table and append `branch_id` to User, Product, Sale, and Credit tables (defaulting existing data to `Branch ID: 1`).
2. **[Backend]** Update CRUD operations in API routes to automatically filter by `current_user.branch_id`.
3. **[Frontend]** Add a "Branch Selection" dropdown on the Admin Dashboard to toggle views (if logged in as Superadmin).
4. **[Frontend]** Ensure all API requests appropriately pass branch context (handled via updated JWT tokens).

---

## 📱 Feature 2: SMS Receipt Integrations

### Overview
Instead of forcing a printout, customers can provide their phone number to receive a secure SMS containing the transaction details and a link to a digital receipt.

### 1. External Provider Choice
To send SMS in Ghana/internationally, we integrate a reliable API provider:
- **Hubtel SMS API** (Best for GH context)
- **Twilio** (Global standard)
- **Arkesel**

### 2. Database Schema Additions
```python
# models/shop_settings.py
# Add fields for SMS gateway config
sms_provider = Column(String, default="hubtel")
sms_api_key = Column(String, nullable=True)
sms_sender_id = Column(String, default="SHOPTRACK")
enable_sms_receipts = Column(Boolean, default=False)

# models/sale.py
# Track if an SMS was sent for a sale
customer_phone = Column(String, nullable=True)
sms_status = Column(String, default="NOT_SENT") # PENDING, SENT, FAILED
```

### 3. Backend Implementation (Background Tasks)
SMS requests involve network calls that can slow down the checkout process. We will use FastAPI's `BackgroundTasks` (or Celery for larger scale) to offload the sending process.

```python
# Example FastAPI Background Task
from fastapi import BackgroundTasks

def send_sms_receipt(phone: str, sale_amount: float, receipt_id: int):
    message = f"Thank you for shopping at ShopTrack! Your total was GH₵{sale_amount}. Receipt: https://shop.com/r/{receipt_id}"
    # Send HTTP request to Hubtel/Twilio
    pass

@router.post("/")
def create_sale(payload: SaleCreate, background_tasks: BackgroundTasks):
    sale = process_sale(payload)
    if payload.customer_phone:
        background_tasks.add_task(send_sms_receipt, payload.customer_phone, sale.total_amount, sale.id)
    return sale
```

### 4. Frontend Implementation
- **Checkout Modal:** Update the POS UI checkout screen to include an optional "Customer Phone Number" input.
- If the phone number field is filled, the frontend passes it in the `POST /sales` payload.
- **Settings Dashboard:** Add a new tab for "SMS Configuration" where the Admin can enter their Provider API Keys and toggle the feature ON/OFF.

### Plan of Action (Step-by-Step)
1. **[Backend]** Generate migrations for `customer_phone`/`sms_status` on `Sale` and SMS API keys on `ShopSettings`.
2. **[Backend]** Create a utility module `app/services/sms.py` to handle the HTTP logic with the chosen Provider (e.g., Hubtel).
3. **[Backend]** Update the `POST /sales` and `POST /credits` endpoints to accept a `phone` parameter and spawn a Background Task.
4. **[Frontend]** Add the Phone Number input to the POS/Credit checkout modals.
5. **[Frontend]** Build an "SMS Gateway" configuration section in the Settings page.

---

## Technical Considerations & Prerequisites
- **Data Migration:** Ensure a smooth transition by injecting a default `Branch 1` into the DB before enforcing `branch_id` constraints on foreign keys.
- **Cost Management (SMS):** SMS APIs charge per message. Ensure the frontend verifies phone number length/format to prevent accidental billing errors for invalid inputs.
- **Background Workers:** If we anticipate high volume, upgrading from FastAPI `BackgroundTasks` to a dedicated `Redis + Celery` worker queue is recommended for SMS resilience.

## 5. Predictive Analytics & AI Forecasting
-**The Upgrade:** Since your backend is already built on FastAPI and Python 3.12, it is perfectly positioned to run lightweight machine learning models. You could implement a local forecasting script to analyze the sales table and predict when items will run out.
-**The Benefit:** Instead of just "Low Stock Alerts" triggered by a static threshold, the system could proactively suggest purchase orders based on historical sales velocity, upcoming holidays, or seasonal trends.

## 6. Multi-Branch Conflict Resolution
-**The Upgrade:** The V2 plan notes that offline transactions will be pushed sequentially to the cloud when online. You might want to implement a robust conflict resolution strategy for edge cases.
-**The Benefit:** If Branch A and Branch B are offline and both process sales that deplete the same central warehouse stock, the backend needs a programmatic way to handle the negative inventory balance once both branches sync.
