import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

from app.api.v1.advisor import router as advisor_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(
    title="InvestIQ AI Advisor",
    description="AI-powered investment recommendations for Indian college students",
    version="1.0.0",
)

app.include_router(advisor_router)


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logging.getLogger(__name__).error("Unhandled error", exc_info=exc)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
