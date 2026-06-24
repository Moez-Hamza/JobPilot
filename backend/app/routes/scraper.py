import httpx
from fastapi import APIRouter, BackgroundTasks, HTTPException
from app.config import settings
from app.database import get_db
from app.models import TriggerScrapeRequest, ImportLinkedInRequest, JobOut
from urllib.parse import urlencode
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/scraper", tags=["Scraper"])

APIFY_LINKEDIN_ACTOR = "curious_coder~linkedin-jobs-scraper"

_scraper_status = {"running": False, "last_result": None}


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
    _scraper_status["running"] = True
    _scraper_status["last_result"] = None
    try:
        _do_scrape()
    finally:
        _scraper_status["running"] = False


def _do_scrape():
    if not settings.APIFY_API_KEY:
        logger.warning("APIFY_API_KEY not set — skipping scrape")
        _scraper_status["last_result"] = "no_api_key"
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
        cutoff = datetime.now(timezone.utc) - timedelta(days=7)
        for item in items:
            url = item.get("link") or item.get("applyUrl") or item.get("url", "")
            if not url:
                continue
            # Filter out jobs posted more than 7 days ago
            posted_at = item.get("postedAt") or item.get("listedAt") or item.get("publishedAt")
            if posted_at:
                try:
                    posted_date = datetime.fromisoformat(posted_at.replace("Z", "+00:00"))
                    if posted_date < cutoff:
                        continue
                except (ValueError, TypeError):
                    pass
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

    _scraper_status["last_result"] = f"{len(new_jobs)} new jobs added"
    logger.info(f"Scrape complete: {len(new_jobs)} new jobs added")


@router.get("/status")
def scraper_status():
    return _scraper_status


@router.post("/trigger")
def trigger_scrape(payload: TriggerScrapeRequest, background_tasks: BackgroundTasks):
    if not settings.APIFY_API_KEY:
        raise HTTPException(status_code=503, detail="APIFY_API_KEY not configured")
    background_tasks.add_task(_run_scrape)
    return {"message": "Scrape started in background"}


@router.post("/import-linkedin", response_model=JobOut)
def import_linkedin_job(payload: ImportLinkedInRequest):
    import re

    url = payload.url.strip()
    if "linkedin.com" not in url:
        raise HTTPException(status_code=400, detail="URL must be a LinkedIn job link")

    # Check if job URL already exists
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM jobs WHERE url = %s", (url,))
            existing = cur.fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="This job is already in your tracker")

    # Scrape LinkedIn job page directly via OG meta tags
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml",
            "Accept-Language": "en-US,en;q=0.9",
        }
        response = httpx.get(url, headers=headers, follow_redirects=True, timeout=15)
        response.raise_for_status()
        html = response.text
    except Exception as e:
        logger.error(f"LinkedIn fetch error: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch job page from LinkedIn")

    # Extract OG title: "{company} hiring {title} in {location} | LinkedIn"
    og_title_match = re.search(r'property="og:title"\s+content="([^"]+)"', html)
    if not og_title_match:
        og_title_match = re.search(r'content="([^"]+)"\s+property="og:title"', html)

    if not og_title_match:
        raise HTTPException(status_code=404, detail="Could not extract job details from this URL")

    og_title = og_title_match.group(1)

    # Parse the OG title pattern
    parsed = re.match(r'^(.+?)\s+hiring\s+(.+?)\s+in\s+(.+?)\s*\|\s*LinkedIn$', og_title)
    if parsed:
        company = parsed.group(1).strip()
        title = parsed.group(2).strip()
        location = parsed.group(3).strip()
    else:
        # Fallback: use full OG title as job title
        title = og_title.replace(" | LinkedIn", "").strip()
        company = "Unknown"
        location = "Unknown"

    # Extract description from OG description
    og_desc_match = re.search(r'property="og:description"\s+content="([^"]+)"', html)
    if not og_desc_match:
        og_desc_match = re.search(r'content="([^"]+)"\s+property="og:description"', html)
    description = og_desc_match.group(1) if og_desc_match else ""
    description = description.replace("&amp;", "&").replace("&#39;", "'").replace("&quot;", '"')

    # Use canonical URL if available
    og_url_match = re.search(r'property="og:url"\s+content="([^"]+)"', html)
    if not og_url_match:
        og_url_match = re.search(r'content="([^"]+)"\s+property="og:url"', html)
    job_url = og_url_match.group(1) if og_url_match else url

    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO jobs (title, company, location, job_description, url, status, date_applied)
                   VALUES (%s, %s, %s, %s, %s, 'Applied', %s)
                   ON CONFLICT (url) DO NOTHING
                   RETURNING *""",
                (title, company, location, description, job_url, datetime.now(timezone.utc)),
            )
            row = cur.fetchone()

    if not row:
        raise HTTPException(status_code=409, detail="This job is already in your tracker")

    return dict(row)
