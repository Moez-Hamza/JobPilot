from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.routes import preferences, jobs, scraper, ai
from app.scheduler import start_scheduler, stop_scheduler
import logging

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    stop_scheduler()


app = FastAPI(
    title="JobPilot API",
    description="Automated Job Tracker & Feedback Loop",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(preferences.router)
app.include_router(jobs.router)
app.include_router(scraper.router)
app.include_router(ai.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "JobPilot API"}
