from fastapi import APIRouter, HTTPException
from openai import OpenAI
import json
import logging
from app.config import settings
from app.database import get_db
from app.models import RejectionAnalysisRequest, OptimizeResumeRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/ai", tags=["AI"])


def _get_openai_client():
    if not settings.OPENAI_API_KEY:
        raise HTTPException(status_code=503, detail="OPENAI_API_KEY not configured")
    return OpenAI(api_key=settings.OPENAI_API_KEY)


@router.post("/analyze-rejection/{job_id}")
def analyze_rejection(job_id: str, payload: RejectionAnalysisRequest):
    client = _get_openai_client()

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
            job = cur.fetchone()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job = dict(job)
    job_description = job.get("job_description") or "Not available"

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

    raw = ""
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
        summary = raw or "Could not parse AI response"
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """UPDATE jobs SET status = 'Rejected', rejection_email_raw = %s,
                   rejection_reason_category = %s, ai_feedback_notes = %s
                   WHERE id = %s""",
                (payload.rejection_email, category, summary, job_id),
            )

    return {"category": category, "summary_of_weakness": summary}


@router.post("/optimize-resume")
def optimize_resume(payload: OptimizeResumeRequest):
    client = _get_openai_client()

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT ai_feedback_notes, title, company, rejection_reason_category
                   FROM jobs WHERE status = 'Rejected' AND ai_feedback_notes IS NOT NULL
                   ORDER BY date_discovered DESC LIMIT 5"""
            )
            historical_feedback = [dict(r) for r in cur.fetchall()]

    if not historical_feedback:
        feedback_text = "No historical rejection data available yet."
    else:
        feedback_text = "\n".join(
            f"- [{r.get('rejection_reason_category', 'N/A')}] {r.get('title', '')} @ {r.get('company', '')}: {r.get('ai_feedback_notes', '')}"
            for r in historical_feedback
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

    raw = ""
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

    return {**parsed, "historical_feedback_used": historical_feedback}
