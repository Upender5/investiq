from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class RiskScoreRequest(BaseModel):
    user_id: str
    trade_count: int = 0
    avg_trade_size: float = 0.0
    unique_symbols: int = 0
    days_active: int = 1
    portfolio_concentration: float = 0.0   # top holding pct
    leverage_used: bool = False
    intraday_ratio: float = 0.0            # pct of intraday trades


class RiskScoreResponse(BaseModel):
    user_id: str
    score: int = Field(ge=0, le=100)
    level: str                             # LOW | MEDIUM | HIGH
    factors: List[str]
    computed_at: datetime
    recommendation: Optional[str] = None


class FraudScoreRequest(BaseModel):
    user_id: str
    transaction_id: str
    amount: float
    transaction_type: str                  # INVEST | REDEEM | WITHDRAW | DEPOSIT
    ip_address: Optional[str] = None
    device_id: Optional[str] = None
    is_new_device: bool = False
    is_new_bank_account: bool = False
    time_since_last_txn_seconds: Optional[float] = None
    transactions_last_hour: int = 0
    transactions_last_day: int = 0
    amount_last_day: float = 0.0


class FraudScoreResponse(BaseModel):
    transaction_id: str
    user_id: str
    fraud_score: float = Field(ge=0.0, le=1.0)
    risk_level: str                        # LOW | MEDIUM | HIGH | CRITICAL
    flags: List[str]
    action: str                            # ALLOW | REVIEW | BLOCK
    computed_at: datetime


class CreditScoreRequest(BaseModel):
    user_id: str
    account_age_days: int = 0
    kyc_verified: bool = False
    trades_completed: int = 0
    failed_transactions: int = 0
    avg_portfolio_value: float = 0.0
    sip_consistency_pct: float = 0.0       # pct of SIP instalments completed on time
    platform_activity_days: int = 0


class CreditScoreResponse(BaseModel):
    user_id: str
    score: int = Field(ge=300, le=900)
    grade: str                             # A+ | A | B | C | D
    factors: List[str]
    max_investment_limit: float
    computed_at: datetime


class StockSentimentResponse(BaseModel):
    symbol: str
    score: float = Field(ge=0.0, le=1.0)
    signal: str                            # BUY | HOLD | SELL
    confidence: float = Field(ge=0.0, le=1.0)


class PortfolioHealthResponse(BaseModel):
    user_id: str
    health_score: int = Field(ge=0, le=100)
    diversification_score: int = Field(ge=0, le=100)
    risk_adjusted_return: float
    concentration_risk: str                # LOW | MEDIUM | HIGH
    recommendations: List[str]


class AmlCheckRequest(BaseModel):
    user_id: str
    transaction_id: str
    amount: float
    transaction_type: str
    cumulative_amount_30d: float = 0.0
    cumulative_amount_year: float = 0.0
    is_pep: bool = False                   # politically exposed person
    source_of_funds: Optional[str] = None


class AmlCheckResponse(BaseModel):
    transaction_id: str
    user_id: str
    is_suspicious: bool
    risk_category: str                     # LOW | MEDIUM | HIGH | VERY_HIGH
    triggered_rules: List[str]
    requires_sar: bool                     # Suspicious Activity Report
    action: str                            # PROCEED | ENHANCED_DUE_DILIGENCE | BLOCK
    computed_at: datetime
