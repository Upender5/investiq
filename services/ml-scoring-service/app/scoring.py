from datetime import datetime
from typing import List, Tuple


def compute_risk_score(trade_count: int, avg_trade_size: float,
                       unique_symbols: int, days_active: int) -> int:
    frequency_score = min(trade_count / max(days_active, 1) * 10, 40)
    concentration   = max(0, 20 - unique_symbols * 2)
    size_score      = min(avg_trade_size / 5000 * 20, 20)
    volatility      = 20 if trade_count > 100 else 10
    return min(100, int(frequency_score + concentration + size_score + volatility))


def compute_sentiment(symbol: str) -> Tuple[float, str]:
    seed = abs(hash(symbol)) % 100
    score = round(0.3 + (seed / 100) * 0.7, 2)
    signal = "BUY" if score >= 0.65 else "HOLD" if score >= 0.45 else "SELL"
    return score, signal


def compute_portfolio_health(positions: List[dict]) -> dict:
    if not positions:
        return {"health_score": 50, "diversification_score": 0,
                "risk_adjusted_return": 0.0, "recommendations": ["Add your first position"]}

    diversification = min(100, len(positions) * 10)
    health_score    = min(100, diversification + 30)
    recs = []
    if len(positions) < 5:
        recs.append("Diversify across at least 5 stocks")
    if len(positions) > 20:
        recs.append("Consider reducing position count to manage risk")
    if not recs:
        recs.append("Portfolio looks well-balanced")

    return {
        "health_score": health_score,
        "diversification_score": diversification,
        "risk_adjusted_return": round(diversification / 10.0 - 2.5, 2),
        "recommendations": recs,
    }
