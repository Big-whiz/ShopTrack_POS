import sys
import os
import random
import uuid
from decimal import Decimal

# Allow running as a standalone script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.models.user import User
from app.models.category import Category
from app.models.product import Product
from app.models.sale import Sale, SaleItem
from app.db.session import SessionLocal

def inflate():
    db = SessionLocal()
    try:
        categories = db.query(Category).all()
        if not categories:
            print("[-] No categories found. Please run seed.py first.")
            return

        category_map = {c.name: c.id for c in categories}
        
        mock_products = [
            # Chargers & Cables
            ("Fast Charger 20W", "Chargers & Cables", 5.0, 12.0),
            ("USB-C to Lightning Cable 1m", "Chargers & Cables", 3.5, 9.0),
            ("Micro USB Cable 2m", "Chargers & Cables", 2.0, 6.0),
            ("65W GaN Laptop Charger", "Chargers & Cables", 15.0, 35.0),
            ("Wireless Charging Pad", "Chargers & Cables", 8.0, 20.0),
            ("Car Charger Dual Port", "Chargers & Cables", 4.0, 10.0),
            
            # Earbuds & Headphones
            ("True Wireless Earbuds Pro", "Earbuds & Headphones", 20.0, 45.0),
            ("Over-Ear ANC Headphones", "Earbuds & Headphones", 35.0, 80.0),
            ("Wired Sport Earphones", "Earbuds & Headphones", 4.0, 12.0),
            ("Bluetooth Neckband", "Earbuds & Headphones", 10.0, 25.0),
            ("Gaming Headset with Mic", "Earbuds & Headphones", 18.0, 40.0),
            
            # Power Banks
            ("Power Bank 10000mAh", "Power Banks", 7.0, 18.0),
            ("Power Bank 20000mAh Dual Port", "Power Banks", 12.0, 28.0),
            ("Mini Power Bank 5000mAh", "Power Banks", 5.0, 12.0),
            ("Solar Power Bank 15000mAh", "Power Banks", 15.0, 35.0),
            
            # Phone Cases & Covers
            ("Silicone Case - iPhone 15", "Phone Cases & Covers", 2.0, 8.0),
            ("Tough Armor Case - Samsung S24", "Phone Cases & Covers", 4.0, 15.0),
            ("Clear Crystal Case - Pixel 8", "Phone Cases & Covers", 1.5, 6.0),
            ("Leather Flip Wallet Case", "Phone Cases & Covers", 6.0, 20.0),
            ("MagSafe Compatible Case", "Phone Cases & Covers", 5.0, 18.0),
            
            # Screen Protectors
            ("Tempered Glass Protector - 2 Pack", "Screen Protectors", 1.0, 5.0),
            ("Privacy Screen Guard", "Screen Protectors", 2.0, 8.0),
            ("Camera Lens Protector", "Screen Protectors", 0.5, 3.0),
            
            # Smartwatches & Bands
            ("Fitness Tracker Band", "Smartwatches & Bands", 8.0, 20.0),
            ("Ultra Smartwatch SE", "Smartwatches & Bands", 25.0, 60.0),
            ("Rugged Outdoor Smartwatch", "Smartwatches & Bands", 40.0, 95.0),
            ("Kids GPS Tracker Watch", "Smartwatches & Bands", 15.0, 35.0),
            
            # Memory & Storage
            ("MicroSD Card 64GB Class 10", "Memory & Storage", 4.0, 12.0),
            ("MicroSD Card 128GB High Speed", "Memory & Storage", 7.0, 20.0),
            ("USB Flash Drive 32GB", "Memory & Storage", 3.0, 10.0),
            ("USB Flash Drive 128GB Dual Port", "Memory & Storage", 9.0, 22.0),
            ("OTG Adapter USB-C to USB-A", "Memory & Storage", 1.0, 5.0),
            
            # Other Gadgets
            ("Mini Bluetooth Speaker", "Other Gadgets", 12.0, 25.0),
            ("Desktop Phone Stand", "Other Gadgets", 2.0, 7.0),
            ("Selfie Stick with Remote", "Other Gadgets", 5.0, 12.0),
            ("LED Desk Lamp for Home Office", "Other Gadgets", 10.0, 25.0),
        ]

        # Inflation of mock products to reach ~100 items
        final_products = []
        for name, cat_name, cost, price in mock_products:
            cat_id = category_map.get(cat_name)
            if not cat_id:
                continue
            
            # Create original
            sku = str(uuid.uuid4())[:8].upper()
            final_products.append(Product(
                sku=f"ST-{sku}",
                name=name,
                description=f"High quality {name} for premium mobility.",
                category_id=cat_id,
                cost_price=Decimal(str(cost)),
                selling_price=Decimal(str(price)),
                current_stock=random.randint(10, 50),
                reorder_level=5
            ))

            # Create variants to reach ~100
            for i in range(2):
                v_sku = str(uuid.uuid4())[:8].upper()
                final_products.append(Product(
                    sku=f"ST-{v_sku}",
                    name=f"{name} (Variant {i+1})",
                    description=f"Alternative variant of {name}.",
                    category_id=cat_id,
                    cost_price=Decimal(str(cost * random.uniform(0.9, 1.1))).quantize(Decimal("0.01")),
                    selling_price=Decimal(str(price * random.uniform(0.9, 1.1))).quantize(Decimal("0.01")),
                    current_stock=random.randint(5, 40),
                    reorder_level=5
                ))

        db.add_all(final_products)
        db.commit()
        print(f"✅ Successfully added {len(final_products)} products to the inventory!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error during inflation: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    inflate()
