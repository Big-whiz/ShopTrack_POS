import sys
import os

# Allow running as a standalone script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import ALL models first so SQLAlchemy can fully configure all relationships
from app.models.user import User          # noqa: F401
from app.models.category import Category  # noqa: F401
from app.models.product import Product    # noqa: F401
from app.models.sale import Sale, SaleItem  # noqa: F401

from app.db.session import SessionLocal
from app.core.security import get_password_hash


def seed():
    db = SessionLocal()
    try:
        # --- Default Admin User ---
        if not db.query(User).filter(User.username == "admin").first():
            admin = User(
                username="admin",
                full_name="System Administrator",
                hashed_password=get_password_hash("admin123"),
                role="admin",
            )
            db.add(admin)
            print("[+] Created admin user (username: admin, password: admin123)")

        # --- Default Categories ---
        default_categories = [
            ("Chargers & Cables", "Phone chargers, USB cables, power adapters"),
            ("Earbuds & Headphones", "Wired and wireless audio accessories"),
            ("Power Banks", "Portable battery chargers"),
            ("Phone Cases & Covers", "Protective cases and covers for phones"),
            ("Screen Protectors", "Tempered glass and film protectors"),
            ("Smartwatches & Bands", "Smart wearables and fitness bands"),
            ("Memory & Storage", "SD cards, flash drives, OTG adapters"),
            ("Other Gadgets", "Miscellaneous electronic accessories"),
        ]
        for name, desc in default_categories:
            if not db.query(Category).filter(Category.name == name).first():
                db.add(Category(name=name, description=desc))
                print(f"[+] Created category: {name}")

        db.commit()
        print("\n✅ Database seeded successfully!")
        print("   Admin login → username: admin | password: admin123")
        print("   ⚠️  Please change the default password immediately after first login.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
