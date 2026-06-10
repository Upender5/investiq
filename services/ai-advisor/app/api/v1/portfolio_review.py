"""
AI Portfolio Review — deep analysis of a user's portfolio with Claude.
Requires KYC-approved user with at least one position.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Analysis"])

DISCLAIMER = (
    "This AI analysis is for educational purposes only and does not constitute "
    "financial advice. Past performance is not indicative of future results."
)


class PortfolioReviewRequest(BaseModel):
    include_tax_analysis: bool = False
    include_rebalancing: bool = True
    time_horizon_years: Optional[int] = Field(None, ge=1, le=40)


class PortfolioReviewResponse(BaseModel):
    overall_health: str          # EXCELLENT | GOOD | FAIR | POOR
    health_score: int            # 0–100
    diversification_score: int
    risk_alignment_score: int
    concentration_risks: list[str]
    recommendations: list[str]
    rebalancing_suggestions: list[dict]
    tax_harvest_opportunities: list[dict]
    disclaimer: str


class StockAnalysisRequest(BaseModel):
    symbol: str = Field(..., min_length=1, max_length=20)
    exchange: str = "NSE"
    analysis_depth: str = Field("STANDARD", pattern="^(QUICK|STANDARD|DEEP)$")


class StockAnalysisResponse(BaseModel):
    symbol: str
    company_name: str
    overall_verdict: str         # BUY | HOLD | SELL | AVOID
    confidence: float            # 0.0–1.0
    target_price: Optional[float]
    upside_percent: Optional[float]
    summary: str
    bull_case: str
    bear_case: str
    key_risks: list[str]
    key_catalysts: list[str]
    disclaimer: str


class RiskAssessmentRequest(BaseModel):
    include_portfolio_var: bool = True
    include_sector_exposure: bool = True
    include_currency_risk: bool = False


class RiskAssessmentResponse(BaseModel):
    overall_risk_level: str      # LOW | MEDIUM | HIGH | VERY_HIGH
    risk_score: int              # 0–100
    var_1d_95: Optional[float]   # 1-day Value at Risk at 95% confidence
    var_10d_95: Optional[float]
    sector_concentration: dict
    top_risk_factors: list[str]
    mitigation_suggestions: list[str]
    disclaimer: str


@router.post(
    "/portfolio/review",
    response_model=PortfolioReviewResponse,
    summary="AI-powered deep portfolio review with health score and rebalancing suggestions",
)
async def portfolio_review(
    body: PortfolioReviewRequest,
    token: dict = Depends(verify_token),
    settings: Settings = Depends(get_settings),
) -> PortfolioReviewResponse:
    # TODO: fetch user portfolio from portfolio service, call Claude for analysis
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="TODO: implement")


@router.post(
    "/stocks/analyze",
    response_model=StockAnalysisResponse,
    summary="AI fundamental + technical analysis of a single stock",
)
async def analyze_stock(
    body: StockAnalysisRequest,
    token: dict = Depends(verify_token),
    settings: Settings = Depends(get_settings),
) -> StockAnalysisResponse:
    # TODO: fetch stock data, news, fundamentals; call Claude
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="TODO: implement")


@router.post(
    "/risk-assessment",
    response_model=RiskAssessmentResponse,
    summary="AI risk assessment of the user's portfolio including VaR and sector concentration",
)
async def risk_assessment(
    body: RiskAssessmentRequest,
    token: dict = Depends(verify_token),
    settings: Settings = Depends(get_settings),
) -> RiskAssessmentResponse:
    # TODO: integrate with ml-scoring-service + Claude
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="TODO: implement")
