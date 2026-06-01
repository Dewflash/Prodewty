from datetime import datetime, date
from sqlalchemy import Integer, String, DateTime, Boolean, Date, func
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=func.now())
    category: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String)
    duration_mins: Mapped[int | None] = mapped_column(Integer)
    mood_rating: Mapped[int] = mapped_column(Integer)
    xp_awarded: Mapped[int] = mapped_column(Integer, default=0)


class RPGState(Base):
    __tablename__ = "rpg_state"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(Integer, unique=True, default=1)
    current_level: Mapped[int] = mapped_column(Integer, default=1)
    total_xp: Mapped[int] = mapped_column(Integer, default=0)
    xp_to_next_level: Mapped[int] = mapped_column(Integer, default=500)
    unallocated_points: Mapped[int] = mapped_column(Integer, default=0)
    strength: Mapped[int] = mapped_column(Integer, default=1)
    wisdom: Mapped[int] = mapped_column(Integer, default=1)
    focus: Mapped[int] = mapped_column(Integer, default=1)
    agility: Mapped[int] = mapped_column(Integer, default=1)
    resilience: Mapped[int] = mapped_column(Integer, default=1)
    title: Mapped[str] = mapped_column(String, default="Unranked")
    streak_days: Mapped[int] = mapped_column(Integer, default=0)
    last_active_date: Mapped[date | None] = mapped_column(Date)
