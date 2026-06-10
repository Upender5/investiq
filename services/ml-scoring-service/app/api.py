"""ML Scoring Service API — risk, fraud, credit, AML, and sentiment endpoints."""
from datetime import datetime, timezone

import redis as redis_lib
from fastapi import APIRouter, Depends

from app.config import settings
from app.schemas import (AmlCheckRequest, AmlCheckResponse, CreditScoreRequest,
                         CreditScoreResponse, FraudScoreRequest, FraudScoreResponse,
                         PortfolioHealthResponse, RiskScoreRequest, RiskScoreResponse,
                         StockSentimentResponse)
from app.scoring import (compute_aml_check, compute_credit_score, compute_fraud_score,
                         compute_portfolio_health, compute_risk_score, compute_sentiment)
from app.security import get_current_user

router = APIRouter(prefix="/api/v1/scoring")

_redis = redis_lib.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD or None,
    decode_responses=True,
)


# ─── Risk Scoring ─────────────────────────────────────────────────────────────

@router.post("/risk", response_model=RiskScoreResponse, summary="Compute trading risk score for a user")
def compute_user_risk(req: RiskScoreRequest, user=Depends(get_current_user)):
    cache_key = f"risk:{req.user_id}"
    cached = _redis.get(cache_key)
    if cached:
        return RiskScoreResponse.model_validate_json(cached)

    result = compute_risk_score(req)
    _redis.setex(cache_key, 300, result.model_dump_json())
    return result


@router.get("/risk/{user_id}", response_model=RiskScoreResponse, summary="Get cached risk score")
def get_risk_score(user_id: str, user=Depends(get_current_user)):
    cache_key = f"risk:{user_id}"
    cached = _redis.get(cache_key)
    if cached:
        return RiskScoreResponse.model_validate_json(cached)
    # Return a default if no data available
    return RiskScoreResponse(
        user_id=user_id,
        score=0,
        level="LOW",
        factors=["No trading data available"],
        computed_at=datetime.now(timezone.utc),
        recommendation="Start investing to build your risk profile.",
    )


# ─── Fraud Detection ──────────────────────────────────────────────────────────

@router.post("/fraud-check", response_model=FraudScoreResponse,
             summary="Real-time fraud score for a transaction")
def fraud_check(req: FraudScoreRequest, user=Depends(get_current_user)):
    result = compute_fraud_score(req)
    # Store high-risk results for audit
    if result.fraud_score >= 0.5:
        _redis.setex(
            f"fraud:alert:{req.transaction_id}",
            86400,  # 24h
            result.model_dump_json(),
        )
    return result


@router.get("/fraud-alerts/{user_id}", summary="Get active fraud alerts for user")
def get_fraud_alerts(user_id: str, user=Depends(get_current_user)):
    pattern = "fraud:alert:*"
    keys = _redis.keys(pattern)
    alerts = []
    for key in keys[:50]:  # cap at 50
        val = _redis.get(key)
        if val:
            data = FraudScoreResponse.model_validate_json(val)
            if data.user_id == user_id:
                alerts.append(data)
    return {"user_id": user_id, "alerts": alerts, "count": len(alerts)}


# ─── Credit Scoring ───────────────────────────────────────────────────────────

@router.post("/credit", response_model=CreditScoreResponse,
             summary="Compute investment credit score determining limits")
def compute_user_credit(req: CreditScoreRequest, user=Depends(get_current_user)):
    cache_key = f"credit:{req.user_id}"
    cached = _redis.get(cache_key)
    if cached:
        return CreditScoreResponse.model_validate_json(cached)

    result = compute_credit_score(req)
    _redis.setex(cache_key, 3600, result.model_dump_json())  # 1h cache
    return result


@router.get("/credit/{user_id}", response_model=CreditScoreResponse,
            summary="Get credit score by user ID")
def get_credit_score(user_id: str, user=Depends(get_current_user)):
    cache_key = f"credit:{user_id}"
    cached = _redis.get(cache_key)
    if cached:
        return CreditScoreResponse.model_validate_json(cached)
    # Default for new users
    return CreditScoreResponse(
        user_id=user_id,
        score=400,
        grade="D",
        factors=["Insufficient data — complete KYC and start investing"],
        max_investment_limit=50000.0,
        computed_at=datetime.now(timezone.utc),
    )


# ─── AML Check ────────────────────────────────────────────────────────────────

@router.post("/aml-check", response_model=AmlCheckResponse,
             summary="AML compliance check per PMLA/RBI guidelines")
def aml_check(req: AmlCheckRequest, user=Depends(get_current_user)):
    result = compute_aml_check(req)
    if result.is_suspicious:
        _redis.setex(
            f"aml:suspicious:{req.transaction_id}",
            604800,  # 7 days
            result.model_dump_json(),
        )
    return result


# ─── Sentiment ────────────────────────────────────────────────────────────────

@router.get("/sentiment/{symbol}", response_model=StockSentimentResponse,
            summary="Stock sentiment score")
def get_sentiment(symbol: str, user=Depends(get_current_user)):
    cache_key = f"sentiment:{symbol.upper()}"
    cached = _redis.get(cache_key)
    if cached:
        return StockSentimentResponse.model_validate_json(cached)

    score, signal = compute_sentiment(symbol)
    result = StockSentimentResponse(
        symbol=symbol.upper(),
        score=score,
        signal=signal,
        confidence=round(0.55 + score * 0.35, 2),
    )
    _redis.setex(cache_key, 300, result.model_dump_json())
    return result


# ─── Portfolio Health ─────────────────────────────────────────────────────────

@router.get("/portfolio-health/{user_id}", response_model=PortfolioHealthResponse,
            summary="Portfolio health and diversification score")
def get_portfolio_health(user_id: str, user=Depends(get_current_user)):
    cache_key = f"portfolio:health:{user_id}"
    cached = _redis.get(cache_key)
    if cached:
        return PortfolioHealthResponse.model_validate_json(cached)

    # In production, fetch positions from trade/fund service
    mock_positions = [
        {"symbol": "TCS", "value": 38000},
        {"symbol": "INFY", "value": 16000},
        {"symbol": "RELIANCE", "value": 24500},
    ]
    result = compute_portfolio_health(user_id, mock_positions)
    _redis.setex(cache_key, 300, result.model_dump_json())
    return result
