"""InvestIQ Analytics Service — portfolio analytics, market insights, admin metrics."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("analytics-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Analytics Service starting up")
    yield
    logger.info("Analytics Service shutting down")


app = FastAPI(
    title="InvestIQ Analytics Service",
    description="Portfolio analytics, P&L history, market insights, tax reports, admin metrics",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:8080"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "analytics-service"}
