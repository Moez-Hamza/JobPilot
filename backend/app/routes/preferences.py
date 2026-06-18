from fastapi import APIRouter, HTTPException
from app.database import get_db
from app.models import UserPreferencesUpdate, UserPreferencesOut

router = APIRouter(prefix="/preferences", tags=["Preferences"])


@router.get("", response_model=UserPreferencesOut)
def get_preferences():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM user_preferences LIMIT 1")
            row = cur.fetchone()
    if not row:
        return {
            "id": 1,
            "target_titles": ["Full Stack Developer", "Backend Engineer"],
            "target_locations": ["Tunis, Tunisia", "Paris, France"],
            "experience_level": "Mid",
            "keywords_include": ["Python", "React", "TypeScript", "Node.js"],
            "keywords_exclude": ["Crypto", "Web3", "Blockchain"],
        }
    return dict(row)


@router.put("", response_model=UserPreferencesOut)
def upsert_preferences(payload: UserPreferencesUpdate):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO user_preferences
                    (id, target_titles, target_locations, experience_level, keywords_include, keywords_exclude)
                VALUES (1, %s, %s, %s, %s, %s)
                ON CONFLICT (id) DO UPDATE SET
                    target_titles = EXCLUDED.target_titles,
                    target_locations = EXCLUDED.target_locations,
                    experience_level = EXCLUDED.experience_level,
                    keywords_include = EXCLUDED.keywords_include,
                    keywords_exclude = EXCLUDED.keywords_exclude
                RETURNING *
            """, (
                payload.target_titles,
                payload.target_locations,
                payload.experience_level,
                payload.keywords_include,
                payload.keywords_exclude,
            ))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=500, detail="Failed to save preferences")
    return dict(row)
