from datetime import datetime, timezone

import redis as redis_lib
from fastapi import APIRouter, Depends

from app.config import settings
from app.schemas import PortfolioHealthResponse, RiskScoreResponse, StockSentimentResponse
from app.scoring import compute_portfolio_health, compute_risk_score, compute_sentiment
from app.security import get_current_user

router = APIRouter(prefix="/api/v1/scoring")

_redis = redis_lib.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT,
                         password=settings.REDIS_PASSWORD or None, decode_responses=True)


@router.get("/risk/{user_id}", response_model=RiskScoreResponse)
def risk_score(user_id: str, user=Depends(get_current_user)):
    cache_key = f"risk:{user_id}"
    cached = _redis.get(cache_key)
    if cached:
        return RiskScoreResponse.model_validate_json(cached)

    score = compute_risk_score(trade_count=25, avg_trade_size=2000.0, unique_symbols=5, days_active=30)
    level = "HIGH" if score >= 70 else "MEDIUM" if score >= 40 else "LOW"
    result = RiskScoreResponse(user_id=user_id, score=score, level=level,
                               factors=["trade frequency", "position concentration"],
                               computed_at=datetime.now(timezone.utc))
    _redis.setex(cache_key, 300, result.model_dump_json())
    return result


@router.get("/sentiment/{symbol}", response_model=StockSentimentResponse)
def sentiment(symbol: str, user=Depends(get_current_user)):
    cache_key = f"sentiment:{symbol.upper()}"
    cached = _redis.get(cache_key)
    if cached:
        return StockSentimentResponse.model_validate_json(cached)

    score, signal = compute_sentiment(symbol)
    result = StockSentimentResponse(symbol=symbol.upper(), score=score, signal=signal,
                                    confidence=round(0.6 + score * 0.2, 2))
    _redis.setex(cache_key, 60, result.model_dump_json())
    return result


@router.get("/portfolio-health/{user_id}", response_model=PortfolioHealthResponse)
def portfolio_health(user_id: str, user=Depends(get_current_user)):
    mock_positions = [{"symbol": "TCS"}, {"symbol": "INFY"}, {"symbol": "RELIANCE"}]
    health = compute_portfolio_health(mock_positions)
    return PortfolioHealthResponse(user_id=user_id, **health)
