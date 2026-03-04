import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.session import SessionLocal
from sqlalchemy import text

def wipe_test_data():
    db = SessionLocal()
    try:
        # Wipe all transactional and product data, reset IDs, but keep Categories
        db.execute(text("TRUNCATE TABLE credits, sale_items, sales, products RESTART IDENTITY CASCADE"))
        
        # Keep only the main admin user, delete any test staff accounts
        db.execute(text("DELETE FROM users WHERE username != 'admin'"))
        
        db.commit()
        print("✅ Success! Wiped all test products, sales, credits, and non-admin users.")
        print("✅ Retained default Categories and the 'admin' master account.")
    except Exception as e:
        db.rollback()
        print(f"❌ Error during wipe: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    wipe_test_data()
