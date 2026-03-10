from pydantic import BaseModel
from decimal import Decimal

class ShopSettingsBase(BaseModel):
    store_name: str
    currency_symbol: str
    tax_rate_percent: Decimal
    receipt_footer_msg: str | None = None
    enable_receipt_print: bool = True

class ShopSettingsCreate(ShopSettingsBase):
    pass

class ShopSettingsUpdate(ShopSettingsBase):
    pass

class ShopSettings(ShopSettingsBase):
    id: int

    class Config:
        from_attributes = True
