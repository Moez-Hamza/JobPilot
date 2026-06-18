from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models import UserPreferencesUpdate, UserPreferencesOut

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get("", response_model=UserPreferencesOut)
def get_preferences():
    db = get_db()
    result = db.table("user_preferences").select("*").limit(1).execute()
    if not result.data:
        return {
            "id": 1,
            "target_titles": ["Full Stack Developer", "Backend Engineer"],
            "target_locations": ["Tunis", "Paris"],
            "experience_level": "Mid",
            "keywords_include": ["Python", "React", "TypeScript", "Node.js"],
            "keywords_exclude": ["Crypto", "Web3", "Blockchain"],
        }
    return result.data[0]


@router.put("", response_model=UserPreferencesOut)
def upsert_preferences(payload: UserPreferencesUpdate):
    db = get_db()
    existing = db.table("user_preferences").select("id").limit(1).execute()
    if existing.data:
        result = (
            db.table("user_preferences")
            .update(payload.model_dump())
            .eq("id", existing.data[0]["id"])
            .execute()
        )
    else:
        result = (
            db.table("user_preferences")
            .insert({**payload.model_dump(), "id": 1})
            .execute()
        )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to save preferences")
    return result.data[0]
