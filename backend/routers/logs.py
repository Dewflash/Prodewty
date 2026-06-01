from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from database import get_db
import models
from services.xp_engine import calculate_xp, apply_xp

router = APIRouter(prefix="/logs", tags=["logs"])


class LogCreate(BaseModel):
    category: str
    mood_rating: int = Field(ge=1, le=10)
    description: str | None = None
    duration_mins: int | None = None


class LogResponse(BaseModel):
    id: int
    xp_awarded: int
    level_up: bool
    new_level: int | None = None

    model_config = {"from_attributes": True}


class ActivityLogOut(BaseModel):
    id: int
    category: str
    mood_rating: int
    description: str | None
    duration_mins: int | None
    xp_awarded: int
    created_at: str

    model_config = {"from_attributes": True}


@router.post("", response_model=LogResponse)
def create_log(payload: LogCreate, db: Session = Depends(get_db)):
    xp = calculate_xp(payload.category, payload.mood_rating, payload.duration_mins)

    log = models.ActivityLog(
        category=payload.category,
        mood_rating=payload.mood_rating,
        description=payload.description,
        duration_mins=payload.duration_mins,
        xp_awarded=xp,
    )
    db.add(log)
    db.flush()

    level_up, state = apply_xp(db, xp, payload.category)
    db.commit()
    db.refresh(log)

    return LogResponse(
        id=log.id,
        xp_awarded=xp,
        level_up=level_up,
        new_level=state.current_level if level_up else None,
    )


@router.get("", response_model=list[ActivityLogOut])
def get_logs(db: Session = Depends(get_db)):
    logs = db.query(models.ActivityLog).order_by(models.ActivityLog.created_at.desc()).all()
    return [
        ActivityLogOut(
            id=l.id,
            category=l.category,
            mood_rating=l.mood_rating,
            description=l.description,
            duration_mins=l.duration_mins,
            xp_awarded=l.xp_awarded,
            created_at=l.created_at.isoformat(),
        )
        for l in logs
    ]
