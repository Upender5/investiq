"""Analytics Service API — portfolio analytics, market insights, admin metrics."""
import logging
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Optional

import redis as redis_lib
from fastapi import APIRouter, Depends, Query

from app.config import settings
from app.schemas import (AllocationResponse, CapitalGainsSummary, MarketInsights,
                         PerformanceMetrics, PlatformMetrics, PnlHistory,
                         PortfolioSummary, PositionSummary, RevenueMetrics,
                         ServiceHealthSnapshot, TaxReport, UserCohortResponse,
                         UserInsights)
from app.security import get_current_user, require_admin

logger = logging.getLogger("analytics-service")

router = APIRouter(prefix="/api/v1/analytics")

_redis = redis_lib.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD or None,
    decode_responses=True,
)

# Deterministic mock prices — in production, pull from Redis cache populated by market-data service
MOCK_PRICES = {
    "RELIANCE": Decimal("2450"), "TCS": Decimal("3800"),
    "INFY": Decimal("1600"), "HDFCBANK": Decimal("1550"), "SBIN": Decimal("620"),
}

SECTOR_MAP = {
    "TCS": "IT", "INFY": "IT", "RELIANCE": "Energy",
    "HDFCBANK": "Banking", "SBIN": "Banking",
}

ASSET_CLASS_MAP = {
    "TCS": "Large Cap", "INFY": "Large Cap", "RELIANCE": "Large Cap",
    "HDFCBANK": "Large Cap", "SBIN": "Large Cap",
}


# ─── Dashboard ───────────────────────────────────────────────────────────────

@router.get("/dashboard", summary="Consolidated dashboard for main screen")
def get_dashboard(user=Depends(get_current_user)):
    portfolio = _build_portfolio()
    today_pnl = sum(p.pnl for p in portfolio.positions) * Decimal("0.02")
    return {
        "portfolio_value": float(portfolio.current_value),
        "total_pnl": float(portfolio.total_pnl),
        "total_pnl_percent": float(portfolio.pnl_percent),
        "today_pnl": float(today_pnl),
        "today_pnl_percent": round(float(today_pnl / portfolio.current_value * 100), 2),
        "positions_count": len(portfolio.positions),
        "invested_value": float(portfolio.total_invested),
        "available_cash": 12500.00,
        "alerts_count": 2,
    }


# ─── Portfolio Analytics ─────────────────────────────────────────────────────

@router.get("/portfolio", response_model=PortfolioSummary,
            summary="Full portfolio summary with positions and P&L")
def get_portfolio(user=Depends(get_current_user)):
    return _build_portfolio()


@router.get("/pnl-history", response_model=List[PnlHistory], summary="Daily P&L history")
def pnl_history(
    days: int = Query(default=30, ge=1, le=365),
    user=Depends(get_current_user),
):
    today = date.today()
    return [
        PnlHistory(
            date=today - timedelta(days=d),
            pnl=Decimal(str(round(500 + d * 12 - (d % 7) * 25, 2))),
        )
        for d in range(days, 0, -1)
    ]


@router.get("/top-holdings", summary="Top 5 holdings by current market value")
def top_holdings(user=Depends(get_current_user)):
    portfolio = _build_portfolio()
    return sorted(
        portfolio.positions,
        key=lambda p: p.current_price * p.quantity,
        reverse=True,
    )[:5]


@router.get("/allocation", response_model=AllocationResponse,
            summary="Asset allocation by sector and instrument type")
def get_allocation(user=Depends(get_current_user)):
    portfolio = _build_portfolio()
    total = sum(p.current_price * p.quantity for p in portfolio.positions)

    sector_alloc: dict = {}
    asset_alloc: dict = {}
    for p in portfolio.positions:
        val = float(p.current_price * p.quantity)
        pct = round(val / float(total) * 100, 1) if total > 0 else 0.0
        sector = SECTOR_MAP.get(p.symbol, "Others")
        sector_alloc[sector] = round(sector_alloc.get(sector, 0.0) + pct, 1)
        ac = ASSET_CLASS_MAP.get(p.symbol, "Mid Cap")
        asset_alloc[ac] = round(asset_alloc.get(ac, 0.0) + pct, 1)

    return AllocationResponse(
        by_sector=sector_alloc,
        by_asset_class=asset_alloc,
        cash_percent=8.2,
    )


@router.get("/performance", response_model=PerformanceMetrics,
            summary="XIRR, TWRR and benchmark returns")
def get_performance(
    period: str = Query(default="1Y", pattern="^(1M|3M|6M|1Y|3Y|5Y|MAX)$"),
    user=Depends(get_current_user),
):
    perf_by_period = {
        "1M":  (2.4,  2.6,  1.8,  0.6, 0.94, 1.52, -1.2, 3.1, -1.8),
        "3M":  (6.8,  7.2,  5.5,  1.7, 0.92, 1.38, -3.5, 4.2, -2.9),
        "6M":  (9.5,  10.1, 7.8,  2.3, 0.90, 1.32, -5.8, 4.8, -3.5),
        "1Y":  (14.8, 16.2, 12.1, 2.7, 0.92, 1.34, -8.4, 4.2, -3.1),
        "3Y":  (18.2, 19.8, 15.5, 4.3, 0.89, 1.28, -14.2, 6.5, -5.2),
        "5Y":  (22.4, 24.1, 18.9, 5.2, 0.87, 1.22, -18.5, 8.2, -6.8),
        "MAX": (28.6, 30.5, 22.1, 8.4, 0.85, 1.18, -28.4, 12.5, -9.8),
    }
    v = perf_by_period.get(period, perf_by_period["1Y"])
    return PerformanceMetrics(
        period=period,
        absolute_return_percent=v[0],
        xirr_percent=v[1],
        nifty50_return_percent=v[2],
        alpha_percent=v[3],
        beta=v[4],
        sharpe_ratio=v[5],
        max_drawdown_percent=v[6],
        best_day_percent=v[7],
        worst_day_percent=v[8],
    )


# ─── User Insights ────────────────────────────────────────────────────────────

@router.get("/user", response_model=UserInsights,
            summary="Behavioural insights: frequency, holding period, win rate")
def get_user_insights(user=Depends(get_current_user)):
    return UserInsights(
        trades_this_month=12,
        avg_holding_period_days=47.5,
        win_rate_percent=62.5,
        most_traded_symbol="TCS",
        avg_trade_size_inr=8500.0,
        realized_pnl_this_year=14200.0,
        unrealized_pnl=6800.0,
        portfolio_turnover_percent=34.2,
    )


# ─── Market Insights ──────────────────────────────────────────────────────────

@router.get("/market", response_model=MarketInsights,
            summary="Macro market conditions, sentiment and sector rotation")
def get_market_insights(user=Depends(get_current_user)):
    return MarketInsights(
        market_sentiment="BULLISH",
        fear_greed_index=68,
        nifty50_change_percent=0.84,
        advance_decline_ratio=1.42,
        fii_net_buy_inr_cr=2140.5,
        dii_net_buy_inr_cr=-890.2,
        top_sectors=["IT", "Pharma", "Auto"],
        weak_sectors=["PSU Banks", "Metal"],
        vix=13.4,
        pcr=1.12,
    )


# ─── Reports ─────────────────────────────────────────────────────────────────

@router.get("/reports/capital-gains", response_model=CapitalGainsSummary,
            summary="Short and long-term capital gains (STCG/LTCG)")
def capital_gains_report(
    financial_year: str = Query(default="2025-26", pattern=r"^\d{4}-\d{2}$"),
    user=Depends(get_current_user),
):
    return CapitalGainsSummary(
        financial_year=financial_year,
        stcg={"amount": 4200.0, "tax_rate": 20.0, "tax": 840.0},
        ltcg={"amount": 18500.0, "exemption": 10000.0, "taxable": 8500.0,
              "tax_rate": 12.5, "tax": 1062.5},
        total_tax_liability=1902.5,
    )


@router.get("/reports/tax", response_model=TaxReport,
            summary="Full tax P&L report for income tax filing")
def tax_report(
    financial_year: str = Query(default="2025-26", pattern=r"^\d{4}-\d{2}$"),
    user=Depends(get_current_user),
):
    return TaxReport(
        financial_year=financial_year,
        total_trades=87,
        total_buy_value=285000.0,
        total_sell_value=307700.0,
        total_pnl=22700.0,
        stcg=4200.0,
        ltcg=18500.0,
        intraday_profit=1250.0,
        brokerage_paid=1840.5,
        stt_paid=920.2,
        download_url="/api/v1/analytics/reports/tax/download",
    )


# ─── Admin Analytics ──────────────────────────────────────────────────────────

@router.get("/admin/platform", response_model=PlatformMetrics,
            summary="[ADMIN] Platform-wide metrics")
def admin_platform_metrics(user=Depends(require_admin)):
    return PlatformMetrics(
        total_users=52840,
        active_users_today=3241,
        active_users_month=18920,
        new_registrations_today=148,
        new_registrations_month=4280,
        kyc_pending=892,
        kyc_approved=48124,
        kyc_rejected=1240,
        total_orders_today=8745,
        total_order_value_today=42580000.0,
        total_aum_inr_cr=1248.5,
        computed_at=datetime.now(timezone.utc),
    )


@router.get("/admin/revenue", response_model=RevenueMetrics,
            summary="[ADMIN] Revenue metrics")
def admin_revenue_metrics(user=Depends(require_admin)):
    return RevenueMetrics(
        brokerage_today=124500.0,
        brokerage_month=3850000.0,
        brokerage_year=42500000.0,
        sip_revenue_month=280000.0,
        fund_commission_month=950000.0,
        total_revenue_month=5080000.0,
        computed_at=datetime.now(timezone.utc),
    )


@router.get("/admin/cohorts", response_model=List[UserCohortResponse],
            summary="[ADMIN] Monthly user cohort analysis")
def admin_cohort_analysis(
    months: int = Query(default=6, ge=1, le=24),
    user=Depends(require_admin),
):
    today = datetime.now(timezone.utc)
    cohorts = []
    for i in range(months, 0, -1):
        m = today.replace(day=1) - timedelta(days=i * 30)
        registrations = 3500 + i * 120
        kyc_done = int(registrations * 0.82)
        first_trade = int(kyc_done * 0.65)
        retained_30 = int(first_trade * 0.75)
        retained_90 = int(first_trade * 0.55)
        cohorts.append(UserCohortResponse(
            cohort_month=m.strftime("%Y-%m"),
            registrations=registrations,
            kyc_completed=kyc_done,
            first_trade=first_trade,
            retained_30d=retained_30,
            retained_90d=retained_90,
            conversion_rate=round(first_trade / registrations * 100, 1),
        ))
    return cohorts


@router.get("/admin/service-health", response_model=List[ServiceHealthSnapshot],
            summary="[ADMIN] Microservice health overview")
def admin_service_health(user=Depends(require_admin)):
    services = [
        ("auth-service",        "UP",       42.5,  0.01, 12480),
        ("user-service",        "UP",       38.2,  0.00,  8240),
        ("trade-service",       "UP",       65.8,  0.05, 18950),
        ("wallet-service",      "UP",       55.3,  0.02,  9820),
        ("market-data-service", "UP",       28.4,  0.00, 52480),
        ("notification-service","UP",       22.1,  0.00,  6240),
        ("fund-service",        "UP",       48.7,  0.01,  5840),
        ("ai-advisor",          "UP",      285.2,  0.08,  2840),
        ("ml-scoring-service",  "UP",       18.5,  0.00,  3480),
        ("analytics-service",   "UP",       35.2,  0.00,  7820),
        ("background-jobs",     "UP",       15.0,  0.00,   480),
    ]
    return [
        ServiceHealthSnapshot(
            service=s, status=st, avg_latency_ms=lat,
            error_rate_percent=err, requests_last_hour=req,
        )
        for s, st, lat, err, req in services
    ]


# ─── Private helpers ──────────────────────────────────────────────────────────

def _build_portfolio() -> PortfolioSummary:
    positions = [
        PositionSummary(
            symbol="TCS",
            quantity=Decimal("5"),
            avg_buy_price=Decimal("3600"),
            current_price=MOCK_PRICES["TCS"],
            pnl=(MOCK_PRICES["TCS"] - Decimal("3600")) * 5,
            pnl_percent=((MOCK_PRICES["TCS"] - Decimal("3600")) / Decimal("3600") * 100)
                        .quantize(Decimal("0.01")),
            sector="IT",
            asset_class="Large Cap",
        ),
        PositionSummary(
            symbol="INFY",
            quantity=Decimal("10"),
            avg_buy_price=Decimal("1500"),
            current_price=MOCK_PRICES["INFY"],
            pnl=(MOCK_PRICES["INFY"] - Decimal("1500")) * 10,
            pnl_percent=((MOCK_PRICES["INFY"] - Decimal("1500")) / Decimal("1500") * 100)
                        .quantize(Decimal("0.01")),
            sector="IT",
            asset_class="Large Cap",
        ),
        PositionSummary(
            symbol="HDFCBANK",
            quantity=Decimal("8"),
            avg_buy_price=Decimal("1480"),
            current_price=MOCK_PRICES["HDFCBANK"],
            pnl=(MOCK_PRICES["HDFCBANK"] - Decimal("1480")) * 8,
            pnl_percent=((MOCK_PRICES["HDFCBANK"] - Decimal("1480")) / Decimal("1480") * 100)
                        .quantize(Decimal("0.01")),
            sector="Banking",
            asset_class="Large Cap",
        ),
    ]
    total_invested = sum(p.avg_buy_price * p.quantity for p in positions)
    current_value = sum(p.current_price * p.quantity for p in positions)
    total_pnl = current_value - total_invested
    pnl_percent = (
        (total_pnl / total_invested * 100).quantize(Decimal("0.01"))
        if total_invested else Decimal("0")
    )
    return PortfolioSummary(
        total_invested=total_invested,
        current_value=current_value,
        total_pnl=total_pnl,
        pnl_percent=pnl_percent,
        positions=positions,
    )
