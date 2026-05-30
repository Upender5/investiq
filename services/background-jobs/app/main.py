from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.jobs import cleanup_stale_orders, kyc_reminders, refresh_market_cache, send_daily_summaries

scheduler = BackgroundScheduler(timezone="Asia/Kolkata")


@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(refresh_market_cache, IntervalTrigger(seconds=30), id="refresh_market")
    scheduler.add_job(cleanup_stale_orders, IntervalTrigger(minutes=5), id="cleanup_orders")
    scheduler.add_job(send_daily_summaries, CronTrigger(hour=18, minute=0), id="daily_summaries")
    scheduler.add_job(kyc_reminders, CronTrigger(hour=10, minute=0), id="kyc_reminders")
    scheduler.start()
    yield
    scheduler.shutdown()


app = FastAPI(title="InvestIQ Background Jobs", version="1.0.0", lifespan=lifespan)

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "background-jobs",
            "scheduler": "running" if scheduler.running else "stopped"}


@app.get("/api/v1/jobs/status")
def jobs_status():
    return [
        {"id": job.id, "name": job.name, "next_run": str(job.next_run_time)}
        for job in scheduler.get_jobs()
    ]
