from datetime import date
from sqlalchemy.orm import Session
import models

BASE_XP: dict[str, int] = {
    "workout": 75,
    "coding": 60,
    "reading": 50,
    "study": 55,
    "admin": 20,
    "journal": 30,
    "devotion": 40,
}

MOOD_MULTIPLIER: dict[int, float] = {
    1: 1.25,
    2: 1.15,
    3: 1.05,
    4: 1.0,
    5: 1.0,
    6: 1.0,
    7: 0.98,
    8: 0.97,
    9: 0.96,
    10: 0.95,
}

CATEGORY_TO_ATTRIBUTE: dict[str, str] = {
    "workout": "strength",
    "coding": "focus",
    "reading": "wisdom",
    "study": "wisdom",
    "admin": "agility",
    "journal": "resilience",
    "devotion": "wisdom",
}


def calculate_xp(category: str, mood_rating: int, duration_mins: int | None) -> int:
    base = BASE_XP.get(category.lower(), 30)
    mood_mult = MOOD_MULTIPLIER.get(mood_rating, 1.0)
    duration_bonus = (duration_mins or 0) / 60 * 15
    return round((base + duration_bonus) * mood_mult)


def xp_required_for_level(level: int) -> int:
    return 500 + (level - 1) * 250


def apply_xp(db: Session, xp: int, category: str) -> tuple[bool, models.RPGState]:
    state = db.query(models.RPGState).filter_by(user_id=1).first()
    if state is None:
        state = models.RPGState(user_id=1)
        db.add(state)
        db.flush()

    state.total_xp += xp
    level_up = False

    while state.total_xp >= state.xp_to_next_level:
        state.total_xp -= state.xp_to_next_level
        state.current_level += 1
        state.xp_to_next_level = xp_required_for_level(state.current_level)
        state.unallocated_points += 3
        level_up = True
        state.title = _title_for_level(state.current_level)

    attribute = CATEGORY_TO_ATTRIBUTE.get(category.lower(), "focus")
    current_val = getattr(state, attribute, 1)
    setattr(state, attribute, current_val + 1)

    today = date.today()
    if state.last_active_date == today:
        pass
    elif state.last_active_date and (today - state.last_active_date).days == 1:
        state.streak_days += 1
    else:
        state.streak_days = 1
    state.last_active_date = today

    db.commit()
    db.refresh(state)
    return level_up, state


def _title_for_level(level: int) -> str:
    titles = {
        1: "Unranked",
        5: "Apprentice",
        10: "Journeyman",
        20: "Adept",
        35: "Expert",
        50: "Master",
        75: "Grandmaster",
        100: "Shadow Monarch",
    }
    for threshold in sorted(titles.keys(), reverse=True):
        if level >= threshold:
            return titles[threshold]
    return "Unranked"
