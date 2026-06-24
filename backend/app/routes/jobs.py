from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.database import get_db
from app.models import JobOut, JobCreate, JobStatusUpdate, JobStatus
from datetime import datetime, timezone, timedelta

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("/stats")
def job_stats():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT status, COUNT(*) as count FROM jobs GROUP BY status")
            rows = cur.fetchall()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM jobs WHERE date_discovered >= %s",
                        (datetime.now(timezone.utc) - timedelta(days=7),))
            recent = cur.fetchone()
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) as count FROM jobs WHERE status = 'Matched' AND date_discovered >= %s",
                        (datetime.now(timezone.utc) - timedelta(days=7),))
            matched_recent = cur.fetchone()
    stats = {row["status"]: row["count"] for row in rows}
    stats["total"] = sum(stats.values())
    stats["last_7_days"] = recent["count"] if recent else 0
    stats["matched_last_7_days"] = matched_recent["count"] if matched_recent else 0
    return stats


@router.get("", response_model=List[JobOut])
def list_jobs(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    days: Optional[int] = Query(None, ge=1, le=365),
    limit: int = Query(12, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    with get_db() as conn:
        with conn.cursor() as cur:
            conditions = []
            params: list = []
            if status:
                conditions.append("status = %s")
                params.append(status)
            if search:
                conditions.append("(LOWER(title) LIKE %s OR LOWER(company) LIKE %s OR LOWER(location) LIKE %s)")
                params += [f"%{search.lower()}%"] * 3
            if days:
                conditions.append("date_discovered >= %s")
                params.append(datetime.now(timezone.utc) - timedelta(days=days))
            where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
            cur.execute(
                f"SELECT * FROM jobs {where} ORDER BY date_discovered DESC LIMIT %s OFFSET %s",
                params + [limit, offset],
            )
            rows = cur.fetchall()
    return [dict(r) for r in rows]


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM jobs WHERE id = %s", (job_id,))
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return dict(row)


@router.post("", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id FROM jobs WHERE url = %s", (payload.url,))
            if cur.fetchone():
                raise HTTPException(status_code=409, detail="Job URL already exists")
            cur.execute(
                """INSERT INTO jobs (title, company, location, job_description, url, status)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
                (payload.title, payload.company, payload.location,
                 payload.job_description, payload.url, payload.status),
            )
            row = cur.fetchone()
    return dict(row)


@router.patch("/{job_id}/status", response_model=JobOut)
def update_job_status(job_id: str, payload: JobStatusUpdate):
    with get_db() as conn:
        with conn.cursor() as cur:
            if payload.status == JobStatus.APPLIED:
                cur.execute(
                    "UPDATE jobs SET status = %s, date_applied = %s WHERE id = %s RETURNING *",
                    (payload.status, datetime.now(timezone.utc), job_id),
                )
            else:
                cur.execute(
                    "UPDATE jobs SET status = %s WHERE id = %s RETURNING *",
                    (payload.status, job_id),
                )
            row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Job not found")
    return dict(row)


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM jobs WHERE id = %s", (job_id,))
