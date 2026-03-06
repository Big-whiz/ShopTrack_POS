from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.shop_settings import ShopSettings as ShopSettingsModel
from app.schemas.shop_settings import ShopSettingsUpdate, ShopSettings as ShopSettingsSchema

router = APIRouter()

@router.get("", response_model=ShopSettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    settings = db.query(ShopSettingsModel).first()
    if not settings:
        settings = ShopSettingsModel()
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=ShopSettingsSchema)
def update_settings(
    settings_in: ShopSettingsUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not enough permissions")
    
    settings = db.query(ShopSettingsModel).first()
    if not settings:
        settings = ShopSettingsModel()
        db.add(settings)
    
    data = settings_in.model_dump(exclude_unset=True) if hasattr(settings_in, 'model_dump') else settings_in.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(settings, field, value)
        
    db.commit()
    db.refresh(settings)
    return settings
