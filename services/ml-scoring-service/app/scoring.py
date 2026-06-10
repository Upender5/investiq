"""
Scoring algorithms for risk, fraud, credit, and AML detection.
All scores are deterministic rule-based models suitable for production
replacement with trained ML models.
"""
from datetime import datetime, timezone
from typing import List, Tuple

from app.schemas import (AmlCheckRequest, AmlCheckResponse, CreditScoreRequest,
                         CreditScoreResponse, FraudScoreRequest, FraudScoreResponse,
                         PortfolioHealthResponse, RiskScoreRequest, RiskScoreResponse,
                         StockSentimentResponse)


# ─── Risk Scoring ─────────────────────────────────────────────────────────────

def compute_risk_score(req: RiskScoreRequest) -> RiskScoreResponse:
    score = 0
    factors: List[str] = []

    # Trade frequency component (0–30 pts)
    freq = req.trade_count / max(req.days_active, 1)
    if freq > 5:
        score += 30; factors.append("Very high trading frequency")
    elif freq > 2:
        score += 20; factors.append("High trading frequency")
    elif freq > 0.5:
        score += 10; factors.append("Moderate trading frequency")

    # Concentration risk (0–25 pts)
    if req.portfolio_concentration >= 0.5:
        score += 25; factors.append("High portfolio concentration (>50% in one stock)")
    elif req.portfolio_concentration >= 0.3:
        score += 15; factors.append("Moderate portfolio concentration")

    # Average trade size (0–20 pts)
    if req.avg_trade_size > 100000:
        score += 20; factors.append("Large average trade size (>₹1L)")
    elif req.avg_trade_size > 25000:
        score += 12; factors.append("Moderate average trade size")
    elif req.avg_trade_size > 5000:
        score += 6; factors.append("Small-to-medium average trade size")

    # Diversification gap (0–15 pts)
    if req.unique_symbols < 3:
        score += 15; factors.append("Very low diversification (<3 symbols)")
    elif req.unique_symbols < 7:
        score += 8; factors.append("Low diversification (<7 symbols)")

    # Leverage penalty (0–10 pts)
    if req.leverage_used:
        score += 10; factors.append("Leverage or margin trading detected")

    # Intraday trading proportion (0–10 pts)
    if req.intraday_ratio > 0.7:
        score += 10; factors.append("Heavy intraday trading (>70% of trades)")
    elif req.intraday_ratio > 0.3:
        score += 5; factors.append("Moderate intraday activity")

    score = min(100, score)
    if score >= 70:
        level = "HIGH"
        recommendation = "Consider reducing position sizes and increasing diversification."
    elif score >= 40:
        level = "MEDIUM"
        recommendation = "Maintain balanced portfolio. Avoid over-concentrating in single stocks."
    else:
        level = "LOW"
        recommendation = "Portfolio risk profile is within acceptable limits. Continue investing."

    if not factors:
        factors.append("Balanced trading behavior")

    return RiskScoreResponse(
        user_id=req.user_id,
        score=score,
        level=level,
        factors=factors,
        computed_at=datetime.now(timezone.utc),
        recommendation=recommendation,
    )


# ─── Fraud Scoring ────────────────────────────────────────────────────────────

def compute_fraud_score(req: FraudScoreRequest) -> FraudScoreResponse:
    score = 0.0
    flags: List[str] = []

    # Velocity checks
    if req.transactions_last_hour > 10:
        score += 0.35; flags.append("HIGH_VELOCITY: >10 transactions in last hour")
    elif req.transactions_last_hour > 5:
        score += 0.15; flags.append("ELEVATED_VELOCITY: >5 transactions in last hour")

    if req.transactions_last_day > 50:
        score += 0.20; flags.append("DAILY_LIMIT_NEAR: >50 transactions today")

    # Amount checks
    if req.amount > 500000:
        score += 0.25; flags.append("LARGE_AMOUNT: Transaction >₹5L")
    elif req.amount > 100000:
        score += 0.10; flags.append("ABOVE_AVERAGE_AMOUNT: Transaction >₹1L")

    if req.amount_last_day > 2000000:
        score += 0.30; flags.append("HIGH_DAILY_AMOUNT: Daily total >₹20L")

    # Device/account risk
    if req.is_new_device:
        score += 0.20; flags.append("NEW_DEVICE: Transaction from unrecognized device")

    if req.is_new_bank_account and req.transaction_type in ("WITHDRAW", "REDEEM"):
        score += 0.25; flags.append("NEW_BANK_ACCOUNT: Withdrawal to newly added account")

    # Timing anomaly
    if req.time_since_last_txn_seconds is not None and req.time_since_last_txn_seconds < 10:
        score += 0.20; flags.append("RAPID_SUCCESSION: Transactions <10s apart")

    score = min(1.0, score)

    if score >= 0.75:
        risk_level, action = "CRITICAL", "BLOCK"
    elif score >= 0.50:
        risk_level, action = "HIGH", "REVIEW"
    elif score >= 0.25:
        risk_level, action = "MEDIUM", "ALLOW"
    else:
        risk_level, action = "LOW", "ALLOW"

    if not flags:
        flags.append("No anomalies detected")

    return FraudScoreResponse(
        transaction_id=req.transaction_id,
        user_id=req.user_id,
        fraud_score=round(score, 4),
        risk_level=risk_level,
        flags=flags,
        action=action,
        computed_at=datetime.now(timezone.utc),
    )


# ─── Credit Scoring ───────────────────────────────────────────────────────────

def compute_credit_score(req: CreditScoreRequest) -> CreditScoreResponse:
    score = 300  # base
    factors: List[str] = []

    # Account age (0–100 pts)
    age_pts = min(100, req.account_age_days // 3)
    score += age_pts
    if age_pts >= 60:
        factors.append("Long account history")
    elif age_pts < 20:
        factors.append("New account — limited history")

    # KYC verification (0–100 pts)
    if req.kyc_verified:
        score += 100; factors.append("KYC verified")
    else:
        factors.append("KYC not completed — limits investment capacity")

    # Trading activity (0–100 pts)
    txn_pts = min(100, req.trades_completed * 2)
    score += txn_pts
    if txn_pts >= 60:
        factors.append("Active trading history")

    # Reliability (failed transaction penalty, 0 to -100 pts)
    if req.failed_transactions > 0:
        penalty = min(100, req.failed_transactions * 10)
        score -= penalty
        if penalty >= 30:
            factors.append(f"Multiple failed transactions ({req.failed_transactions})")

    # Portfolio value (0–100 pts)
    if req.avg_portfolio_value > 100000:
        score += 100; factors.append("High average portfolio value")
    elif req.avg_portfolio_value > 10000:
        score += 50; factors.append("Moderate portfolio value")

    # SIP consistency (0–100 pts)
    sip_pts = int(req.sip_consistency_pct * 100)
    score += sip_pts
    if sip_pts >= 80:
        factors.append("Excellent SIP payment consistency")

    # Platform engagement (0–100 pts)
    if req.platform_activity_days > 180:
        score += 100; factors.append("Highly engaged user")
    elif req.platform_activity_days > 30:
        score += 50

    score = max(300, min(900, score))

    if score >= 800:
        grade = "A+"
        max_limit = 10_000_000.0  # ₹1Cr
    elif score >= 700:
        grade = "A"
        max_limit = 5_000_000.0   # ₹50L
    elif score >= 600:
        grade = "B"
        max_limit = 1_000_000.0   # ₹10L
    elif score >= 500:
        grade = "C"
        max_limit = 200_000.0     # ₹2L
    else:
        grade = "D"
        max_limit = 50_000.0      # ₹50K

    return CreditScoreResponse(
        user_id=req.user_id,
        score=score,
        grade=grade,
        factors=factors,
        max_investment_limit=max_limit,
        computed_at=datetime.now(timezone.utc),
    )


# ─── AML Check ────────────────────────────────────────────────────────────────

def compute_aml_check(req: AmlCheckRequest) -> AmlCheckResponse:
    """PMLA 2002 / RBI AML guidelines rule-based checks."""
    triggered: List[str] = []
    risk_score = 0

    # SEBI/RBI threshold: ₹50,000+ requires enhanced due diligence
    if req.amount >= 50000:
        triggered.append("SEBI_THRESHOLD_50K: Amount ≥ ₹50,000")
        risk_score += 20

    # ₹10L single transaction CTR (Cash Transaction Report)
    if req.amount >= 1000000:
        triggered.append("CTR_REQUIRED: Single transaction ≥ ₹10,00,000")
        risk_score += 40

    # Cumulative monthly threshold ₹5L
    if req.cumulative_amount_30d >= 500000:
        triggered.append("CUMULATIVE_30D_5L: Monthly cumulative ≥ ₹5,00,000")
        risk_score += 25

    # Annual threshold ₹50L
    if req.cumulative_amount_year >= 5000000:
        triggered.append("CUMULATIVE_ANNUAL_50L: Annual cumulative ≥ ₹50,00,000")
        risk_score += 30

    # PEP check
    if req.is_pep:
        triggered.append("PEP_FLAG: Politically Exposed Person")
        risk_score += 50

    # Source of funds not declared for large amounts
    if req.amount >= 200000 and not req.source_of_funds:
        triggered.append("SOURCE_OF_FUNDS_MISSING: Large transaction with no declared source")
        risk_score += 15

    risk_score = min(100, risk_score)

    if risk_score >= 75:
        risk_category = "VERY_HIGH"
        requires_sar = True
        action = "BLOCK"
    elif risk_score >= 50:
        risk_category = "HIGH"
        requires_sar = True
        action = "ENHANCED_DUE_DILIGENCE"
    elif risk_score >= 25:
        risk_category = "MEDIUM"
        requires_sar = False
        action = "ENHANCED_DUE_DILIGENCE"
    else:
        risk_category = "LOW"
        requires_sar = False
        action = "PROCEED"

    return AmlCheckResponse(
        transaction_id=req.transaction_id,
        user_id=req.user_id,
        is_suspicious=risk_score >= 50,
        risk_category=risk_category,
        triggered_rules=triggered if triggered else ["No AML rules triggered"],
        requires_sar=requires_sar,
        action=action,
        computed_at=datetime.now(timezone.utc),
    )


# ─── Stock Sentiment ──────────────────────────────────────────────────────────

def compute_sentiment(symbol: str) -> Tuple[float, str]:
    """Deterministic sentiment based on symbol hash — replace with NLP model."""
    seed = abs(hash(symbol)) % 100
    score = round(0.25 + (seed / 100) * 0.75, 2)
    signal = "BUY" if score >= 0.65 else "HOLD" if score >= 0.45 else "SELL"
    return score, signal


# ─── Portfolio Health ─────────────────────────────────────────────────────────

def compute_portfolio_health(user_id: str, positions: list) -> PortfolioHealthResponse:
    if not positions:
        return PortfolioHealthResponse(
            user_id=user_id,
            health_score=50,
            diversification_score=0,
            risk_adjusted_return=0.0,
            concentration_risk="HIGH",
            recommendations=["Add your first position to start building wealth"],
        )

    count = len(positions)
    diversification = min(100, count * 8)

    # Concentration: estimate top holding pct if positions have value
    total_value = sum(p.get("value", 1) for p in positions)
    max_single = max((p.get("value", 0) for p in positions), default=0)
    top_pct = max_single / total_value if total_value > 0 else 1.0

    if top_pct >= 0.5:
        concentration_risk = "HIGH"
        conc_score = -20
    elif top_pct >= 0.3:
        concentration_risk = "MEDIUM"
        conc_score = -5
    else:
        concentration_risk = "LOW"
        conc_score = 10

    health_score = min(100, max(0, diversification + conc_score + 20))

    recs = []
    if count < 5:
        recs.append("Diversify across at least 5 securities to reduce concentration risk")
    if count > 25:
        recs.append("Consider reducing holdings — too many positions can dilute focus")
    if top_pct >= 0.4:
        recs.append("Top holding exceeds 40% — rebalance to reduce concentration risk")
    if count >= 5 and top_pct < 0.4:
        recs.append("Portfolio is well-balanced. Continue with systematic investment")

    return PortfolioHealthResponse(
        user_id=user_id,
        health_score=health_score,
        diversification_score=diversification,
        risk_adjusted_return=round(diversification / 10.0 - 2.5, 2),
        concentration_risk=concentration_risk,
        recommendations=recs if recs else ["Portfolio looks well-balanced"],
    )
