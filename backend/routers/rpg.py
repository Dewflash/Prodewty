from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
import models

router = APIRouter(prefix="/rpg", tags=["rpg"])


class RPGStateOut(BaseModel):
    current_level: int
    total_xp: int
    xp_to_next_level: int
    unallocated_points: int
    strength: int
    wisdom: int
    focus: int
    agility: int
    resilience: int
    title: str
    streak_days: int

    model_config = {"from_attributes": True}


@router.get("/state", response_model=RPGStateOut)
def get_rpg_state(db: Session = Depends(get_db)):
    state = db.query(models.RPGState).filter_by(user_id=1).first()
    if state is None:
        state = models.RPGState(user_id=1)
        db.add(state)
        db.commit()
        db.refresh(state)
    return state
