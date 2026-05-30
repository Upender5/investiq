from datetime import datetime
from typing import List

from pydantic import BaseModel


class RiskScoreResponse(BaseModel):
    user_id: str
    score: int
    level: str
    factors: List[str]
    computed_at: datetime


class StockSentimentResponse(BaseModel):
    symbol: str
    score: float
    signal: str
    confidence: float


class PortfolioHealthResponse(BaseModel):
    user_id: str
    health_score: int
    diversification_score: int
    risk_adjusted_return: float
    recommendations: List[str]
