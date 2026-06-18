from fastapi import APIRouter, HTTPException, Query
from typing import Optional, List
from app.database import get_db
from app.models import JobOut, JobCreate, JobStatusUpdate, JobStatus
from datetime import datetime, timezone

router = APIRouter(prefix="/jobs", tags=["Jobs"])


@router.get("", response_model=List[JobOut])
def list_jobs(
    status: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    with get_db() as conn:
        with conn.cursor() as cur:
            if status and search:
                cur.execute(
                    """SELECT * FROM jobs
                       WHERE status = %s
                         AND (LOWER(title) LIKE %s OR LOWER(company) LIKE %s OR LOWER(location) LIKE %s)
                       ORDER BY date_discovered DESC""",
                    (status, f"%{search.lower()}%", f"%{search.lower()}%", f"%{search.lower()}%"),
                )
            elif status:
                cur.execute(
                    "SELECT * FROM jobs WHERE status = %s ORDER BY date_discovered DESC",
                    (status,),
                )
            elif search:
                cur.execute(
                    """SELECT * FROM jobs
                       WHERE LOWER(title) LIKE %s OR LOWER(company) LIKE %s OR LOWER(location) LIKE %s
                       ORDER BY date_discovered DESC""",
                    (f"%{search.lower()}%", f"%{search.lower()}%", f"%{search.lower()}%"),
                )
            else:
                cur.execute("SELECT * FROM jobs ORDER BY date_discovered DESC")
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
