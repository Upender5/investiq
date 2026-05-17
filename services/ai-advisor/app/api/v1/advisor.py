import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.advisor import AdvisorService
from app.cache import CacheService
from app.config import Settings, get_settings
from app.schemas import AdvisorRequest, AdvisorResponse
from app.security import DISCLAIMER, verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/advisor", tags=["advisor"])


def get_advisor(settings: Settings = Depends(get_settings)) -> AdvisorService:
    return AdvisorService(settings)


def get_cache(settings: Settings = Depends(get_settings)) -> CacheService:
    return CacheService(settings)


@router.post(
    "/recommend",
    response_model=AdvisorResponse,
    summary="Get an AI-powered investment recommendation",
)
async def recommend(
    body: AdvisorRequest,
    _token: dict = Depends(verify_token),
    advisor: AdvisorService = Depends(get_advisor),
    cache: CacheService = Depends(get_cache),
) -> AdvisorResponse:
    user_id = str(body.user_id)
    risk = body.risk_profile.value
    budget = body.budget_inr

    # 1. Cache lookup (6-hour TTL)
    cached = await cache.get(user_id, risk, budget, body.question)
    if cached:
        return AdvisorResponse(**cached)

    # 2. Call Claude via LangChain pipeline
    try:
        result = await advisor.recommend(risk, budget, body.question)
    except Exception as exc:
        logger.error("Advisor call failed: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI advisor temporarily unavailable",
        )

    # 3. Enforce mandatory disclaimer regardless of what the model returned
    result["disclaimer"] = DISCLAIMER

    # 4. Persist to cache
    await cache.set(user_id, risk, budget, body.question, result)

    return AdvisorResponse(**result)
