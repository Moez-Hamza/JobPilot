from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
import logging

logger = logging.getLogger(__name__)
_scheduler: BackgroundScheduler | None = None


def _scrape_job():
    from app.routes.scraper import _run_scrape
    logger.info("Scheduled scrape starting...")
    _run_scrape()


def start_scheduler():
    global _scheduler
    _scheduler = BackgroundScheduler()
    _scheduler.add_job(
        _scrape_job,
        CronTrigger(hour=8, minute=0),
        id="daily_scrape",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("APScheduler started: daily scrape at 08:00")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
