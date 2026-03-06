from sqlalchemy import Column, Integer, String, Numeric
from app.db.base_class import Base

class ShopSettings(Base):
    __tablename__ = "shop_settings"

    id = Column(Integer, primary_key=True, index=True)
    store_name = Column(String(255), nullable=False, default="ShopTrack POS")
    currency_symbol = Column(String(10), nullable=False, default="GH₵")
    tax_rate_percent = Column(Numeric(5, 2), nullable=False, default=0.00)
    receipt_footer_msg = Column(String(255), nullable=True, default="Thank you for your purchase!")
