from pydantic import BaseModel, HttpUrl
from typing import Optional, List
from datetime import datetime
from enum import Enum


class JobStatus(str, Enum):
    MATCHED = "Matched"
    APPLIED = "Applied"
    INTERVIEWING = "Interviewing"
    REJECTED = "Rejected"
    OFFER = "Offer"


class UserPreferencesUpdate(BaseModel):
    target_titles: List[str]
    target_locations: List[str]
    experience_level: str
    keywords_include: List[str]
    keywords_exclude: List[str]


class UserPreferencesOut(BaseModel):
    id: int
    target_titles: List[str]
    target_locations: List[str]
    experience_level: str
    keywords_include: List[str]
    keywords_exclude: List[str]


class JobCreate(BaseModel):
    title: str
    company: str
    location: str
    job_description: Optional[str] = None
    url: str
    status: JobStatus = JobStatus.MATCHED


class JobOut(BaseModel):
    id: str
    title: str
    company: str
    location: str
    job_description: Optional[str] = None
    url: str
    status: JobStatus
    date_discovered: Optional[datetime] = None
    date_applied: Optional[datetime] = None
    rejection_email_raw: Optional[str] = None
    rejection_reason_category: Optional[str] = None
    ai_feedback_notes: Optional[str] = None


class JobStatusUpdate(BaseModel):
    status: JobStatus


class RejectionAnalysisRequest(BaseModel):
    rejection_email: str


class OptimizeResumeRequest(BaseModel):
    job_description: str
    resume_bullets: str


class TriggerScrapeRequest(BaseModel):
    force: bool = False


class ImportLinkedInRequest(BaseModel):
    url: str
