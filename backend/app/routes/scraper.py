import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.config import settings
from app.database import get_db
from app.models import TriggerScrapeRequest
from urllib.parse import urlencode
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scraper", tags=["Scraper"])

APIFY_LINKEDIN_ACTOR = "curious_coder~linkedin-jobs-scraper"


def _send_notification(job: dict):
    message = (
        f"**New Job Match!** {job['title']} @ {job['company']} "
        f"({job['location']})\n{job['url']}"
    )
    if settings.DISCORD_WEBHOOK_URL:
        try:
            httpx.post(settings.DISCORD_WEBHOOK_URL, json={"content": message}, timeout=5)
        except Exception as e:
            logger.warning(f"Discord notification failed: {e}")
    if settings.SLACK_WEBHOOK_URL:
        try:
            httpx.post(settings.SLACK_WEBHOOK_URL, json={"text": message}, timeout=5)
        except Exception as e:
            logger.warning(f"Slack notification failed: {e}")


def _run_scrape():
    if not settings.APIFY_API_KEY:
        logger.warning("APIFY_API_KEY not set — skipping scrape")
        return

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM user_preferences LIMIT 1")
            prefs = cur.fetchone()

    if not prefs:
        logger.warning("No user preferences found, skipping scrape")
        return

    titles: list = prefs["target_titles"] or []
    locations: list = prefs["target_locations"] or []
    keywords_exclude: list = prefs["keywords_exclude"] or []
    new_jobs = []

    linkedin_urls = []
    for title in titles:
        for location in locations:
            qs = urlencode({"keywords": title, "location": location})
            linkedin_urls.append(f"https://www.linkedin.com/jobs/search/?{qs}")

    if not linkedin_urls:
        logger.warning("No search URLs to scrape")
        return

    try:
        run_input = {"urls": linkedin_urls, "count": 25}
        response = httpx.post(
            f"https://api.apify.com/v2/acts/{APIFY_LINKEDIN_ACTOR}/run-sync-get-dataset-items",
            params={"token": settings.APIFY_API_KEY, "timeout": 120, "memory": 512},
            json=run_input,
            timeout=180,
        )
        response.raise_for_status()
        items = response.json()
        location_keywords = [loc.split(",")[0].strip().lower() for loc in locations]
        for item in items:
            url = item.get("link") or item.get("applyUrl") or item.get("url", "")
            if not url:
                continue
            job_location = (item.get("location") or "").lower()
            if location_keywords and not any(kw in job_location for kw in location_keywords):
                continue
            description = item.get("descriptionText") or item.get("description", "") or ""
            if any(kw.lower() in description.lower() for kw in keywords_exclude if kw):
                continue
            try:
                with get_db() as conn:
                    with conn.cursor() as cur:
                        cur.execute(
                            """INSERT INTO jobs (title, company, location, job_description, url, status)
                               VALUES (%s, %s, %s, %s, %s, 'Matched')
                               ON CONFLICT (url) DO NOTHING
                               RETURNING *""",
                            (
                                item.get("title", "Unknown"),
                                item.get("companyName", item.get("company", "Unknown")),
                                item.get("location", "Unknown"),
                                description,
                                url,
                            ),
                        )
                        row = cur.fetchone()
                if row:
                    new_jobs.append(dict(row))
            except Exception as e:
                logger.error(f"DB insert error: {e}")
    except Exception as e:
        logger.error(f"Apify scrape error: {e}")

    for job in new_jobs:
        _send_notification(job)

    logger.info(f"Scrape complete: {len(new_jobs)} new jobs added")


@router.post("/trigger")
def trigger_scrape(payload: TriggerScrapeRequest, background_tasks: BackgroundTasks):
    if not settings.APIFY_API_KEY:
        raise HTTPException(status_code=503, detail="APIFY_API_KEY not configured")
    background_tasks.add_task(_run_scrape)
    return {"message": "Scrape started in background"}
