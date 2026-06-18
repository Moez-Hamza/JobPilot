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
    db = get_db()
    query = db.table("jobs").select("*").order("date_discovered", desc=True)
    if status:
        query = query.eq("status", status)
    result = query.execute()
    jobs = result.data or []
    if search:
        s = search.lower()
        jobs = [
            j
            for j in jobs
            if s in j.get("title", "").lower()
            or s in j.get("company", "").lower()
            or s in j.get("location", "").lower()
        ]
    return jobs


@router.get("/{job_id}", response_model=JobOut)
def get_job(job_id: str):
    db = get_db()
    result = db.table("jobs").select("*").eq("id", job_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data


@router.post("", response_model=JobOut, status_code=201)
def create_job(payload: JobCreate):
    db = get_db()
    existing = db.table("jobs").select("id").eq("url", payload.url).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Job URL already exists")
    result = db.table("jobs").insert(payload.model_dump()).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create job")
    return result.data[0]


@router.patch("/{job_id}/status", response_model=JobOut)
def update_job_status(job_id: str, payload: JobStatusUpdate):
    db = get_db()
    update_data = {"status": payload.status}
    if payload.status == JobStatus.APPLIED:
        update_data["date_applied"] = datetime.now(timezone.utc).isoformat()
    result = (
        db.table("jobs").update(update_data).eq("id", job_id).execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Job not found")
    return result.data[0]


@router.delete("/{job_id}", status_code=204)
def delete_job(job_id: str):
    db = get_db()
    db.table("jobs").delete().eq("id", job_id).execute()
