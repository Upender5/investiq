"""InvestIQ ML Scoring Service — fraud detection, risk scoring, AML checks."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import router
from app.envelope import install_envelope

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("ml-scoring-service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("ML Scoring Service starting up")
    yield
    logger.info("ML Scoring Service shutting down")


app = FastAPI(
    title="InvestIQ ML Scoring Service",
    description="Risk scoring, fraud detection, credit scoring and AML compliance",
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
install_envelope(app)


@app.get("/health", tags=["Health"])
def health():
    return {"status": "ok", "service": "ml-scoring-service"}
