from datetime import date, datetime
from decimal import Decimal
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


# ─── Portfolio ────────────────────────────────────────────────────────────────

class TradeRecord(BaseModel):
    symbol: str
    side: str
    quantity: Decimal
    price: Decimal
    executed_at: datetime


class PositionSummary(BaseModel):
    symbol: str
    quantity: Decimal
    avg_buy_price: Decimal
    current_price: Decimal
    pnl: Decimal
    pnl_percent: Decimal
    sector: Optional[str] = None
    asset_class: Optional[str] = None


class PortfolioSummary(BaseModel):
    total_invested: Decimal
    current_value: Decimal
    total_pnl: Decimal
    pnl_percent: Decimal
    positions: List[PositionSummary]


class PnlHistory(BaseModel):
    date: date
    pnl: Decimal


# ─── Performance ──────────────────────────────────────────────────────────────

class PerformanceMetrics(BaseModel):
    period: str
    absolute_return_percent: float
    xirr_percent: float
    nifty50_return_percent: float
    alpha_percent: float
    beta: float
    sharpe_ratio: float
    max_drawdown_percent: float
    best_day_percent: float
    worst_day_percent: float


# ─── Allocation ───────────────────────────────────────────────────────────────

class AllocationResponse(BaseModel):
    by_sector: Dict[str, float]
    by_asset_class: Dict[str, float]
    cash_percent: float


# ─── User Insights ────────────────────────────────────────────────────────────

class UserInsights(BaseModel):
    trades_this_month: int
    avg_holding_period_days: float
    win_rate_percent: float
    most_traded_symbol: Optional[str]
    avg_trade_size_inr: float
    realized_pnl_this_year: float
    unrealized_pnl: float
    portfolio_turnover_percent: float


# ─── Market Insights ──────────────────────────────────────────────────────────

class MarketInsights(BaseModel):
    market_sentiment: str
    fear_greed_index: int = Field(ge=0, le=100)
    nifty50_change_percent: float
    advance_decline_ratio: float
    fii_net_buy_inr_cr: float
    dii_net_buy_inr_cr: float
    top_sectors: List[str]
    weak_sectors: List[str]
    vix: float
    pcr: float


# ─── Tax / Reports ────────────────────────────────────────────────────────────

class CapitalGainsSummary(BaseModel):
    financial_year: str
    stcg: Dict[str, float]    # amount, tax_rate, tax
    ltcg: Dict[str, float]    # amount, exemption, taxable, tax_rate, tax
    total_tax_liability: float


class TaxReport(BaseModel):
    financial_year: str
    total_trades: int
    total_buy_value: float
    total_sell_value: float
    total_pnl: float
    stcg: float
    ltcg: float
    intraday_profit: float
    brokerage_paid: float
    stt_paid: float
    download_url: str


# ─── Admin Analytics ──────────────────────────────────────────────────────────

class PlatformMetrics(BaseModel):
    total_users: int
    active_users_today: int
    active_users_month: int
    new_registrations_today: int
    new_registrations_month: int
    kyc_pending: int
    kyc_approved: int
    kyc_rejected: int
    total_orders_today: int
    total_order_value_today: float
    total_aum_inr_cr: float
    computed_at: datetime


class RevenueMetrics(BaseModel):
    brokerage_today: float
    brokerage_month: float
    brokerage_year: float
    sip_revenue_month: float
    fund_commission_month: float
    total_revenue_month: float
    computed_at: datetime


class UserCohortResponse(BaseModel):
    cohort_month: str
    registrations: int
    kyc_completed: int
    first_trade: int
    retained_30d: int
    retained_90d: int
    conversion_rate: float


class ServiceHealthSnapshot(BaseModel):
    service: str
    status: str           # UP | DOWN | DEGRADED
    avg_latency_ms: float
    error_rate_percent: float
    requests_last_hour: int
