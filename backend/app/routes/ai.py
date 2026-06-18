from fastapi import APIRouter, HTTPException
from openai import OpenAI
import json
import logging
from app.config import settings
from app.database import get_db
from app.models import RejectionAnalysisRequest, OptimizeResumeRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])

client = OpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("/analyze-rejection/{job_id}")
def analyze_rejection(job_id: str, payload: RejectionAnalysisRequest):
    db = get_db()
    job_result = db.table("jobs").select("*").eq("id", job_id).single().execute()
    if not job_result.data:
        raise HTTPException(status_code=404, detail="Job not found")

    job = job_result.data
    job_description = job.get("job_description", "Not available")

    system_prompt = (
        "You are a career coach AI. Analyze a rejection email and the original job description. "
        "Extract the concrete reason for refusal. "
        "Return ONLY a valid JSON object with exactly these keys: "
        '{"category": "<one of: Skill Gap, Experience Level, Cultural Fit, Overqualified, Generic/Ghosted, Location, Other>", '
        '"summary_of_weakness": "<2-3 sentence actionable summary>"}'
    )

    user_prompt = (
        f"Job Title: {job.get('title', 'Unknown')}\n"
        f"Company: {job.get('company', 'Unknown')}\n\n"
        f"Job Description:\n{job_description[:3000]}\n\n"
        f"Rejection Email:\n{payload.rejection_email[:2000]}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_tokens=400,
        )
        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)
        category = parsed.get("category", "Generic/Ghosted")
        summary = parsed.get("summary_of_weakness", raw)
    except json.JSONDecodeError:
        category = "Generic/Ghosted"
        summary = raw if "raw" in dir() else "Could not parse AI response"
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    db.table("jobs").update(
        {
            "status": "Rejected",
            "rejection_email_raw": payload.rejection_email,
            "rejection_reason_category": category,
            "ai_feedback_notes": summary,
        }
    ).eq("id", job_id).execute()

    return {"category": category, "summary_of_weakness": summary}


@router.post("/optimize-resume")
def optimize_resume(payload: OptimizeResumeRequest):
    db = get_db()
    history_result = (
        db.table("jobs")
        .select("ai_feedback_notes, title, company, rejection_reason_category")
        .eq("status", "Rejected")
        .not_.is_("ai_feedback_notes", "null")
        .order("date_discovered", desc=True)
        .limit(5)
        .execute()
    )
    historical_feedback = history_result.data or []

    if not historical_feedback:
        feedback_text = "No historical rejection data available yet."
    else:
        feedback_text = "\n".join(
            [
                f"- [{r.get('rejection_reason_category', 'N/A')}] {r.get('title', '')} @ {r.get('company', '')}: {r.get('ai_feedback_notes', '')}"
                for r in historical_feedback
            ]
        )

    system_prompt = (
        "You are an expert resume writer and career coach. "
        "Rewrite the provided resume bullet points to maximize the candidate's chances for the target job. "
        "Reference the historical weaknesses to proactively address them. "
        "Return a JSON object with key 'optimized_bullets' containing a list of improved bullet point strings, "
        "and 'strategy_notes' with a brief explanation of changes made."
    )

    user_prompt = (
        f"TARGET JOB DESCRIPTION:\n{payload.job_description[:3000]}\n\n"
        f"CANDIDATE'S CURRENT RESUME BULLETS:\n{payload.resume_bullets[:2000]}\n\n"
        f"HISTORICAL REJECTION WEAKNESSES TO ADDRESS:\n{feedback_text}"
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.4,
            max_tokens=1200,
        )
        raw = response.choices[0].message.content.strip()
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        parsed = {"optimized_bullets": [], "strategy_notes": raw}
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    return {
        **parsed,
        "historical_feedback_used": historical_feedback,
    }
