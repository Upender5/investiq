import logging

from fastapi import FastAPI

from app.api.v1.advisor import router as advisor_router
from app.api.v1.chat import router as chat_router
from app.api.v1.portfolio_review import router as portfolio_router
from app.api.v1.goal_advisor import router as goal_router
from app.envelope import install_envelope

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

app = FastAPI(
    title="InvestIQ AI Service",
    description=(
        "AI-powered investment advisor, portfolio review, stock analysis, "
        "risk assessment, goal planning and recommendations for InvestIQ. "
        "Powered by Claude (Anthropic). All responses include mandatory disclaimer."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.include_router(advisor_router)
app.include_router(chat_router)
app.include_router(portfolio_router)
app.include_router(goal_router)
install_envelope(app)


@app.get("/health", tags=["Health"])
async def health() -> dict:
    return {"status": "ok", "service": "ai-advisor"}
