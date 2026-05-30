from datetime import date, timedelta
from decimal import Decimal
from typing import List

from fastapi import APIRouter, Depends

from app.schemas import PnlHistory, PortfolioSummary, PositionSummary
from app.security import get_current_user

router = APIRouter(prefix="/api/v1/analytics")

MOCK_PRICES = {
    "RELIANCE": Decimal("2450"), "TCS": Decimal("3800"),
    "INFY": Decimal("1600"), "HDFCBANK": Decimal("1550"), "SBIN": Decimal("620"),
}


@router.get("/portfolio", response_model=PortfolioSummary)
def get_portfolio(user=Depends(get_current_user)):
    positions = [
        PositionSummary(
            symbol="TCS", quantity=Decimal("5"), avg_buy_price=Decimal("3600"),
            current_price=MOCK_PRICES["TCS"],
            pnl=(MOCK_PRICES["TCS"] - Decimal("3600")) * 5,
            pnl_percent=((MOCK_PRICES["TCS"] - Decimal("3600")) / Decimal("3600") * 100).quantize(Decimal("0.01")),
        ),
        PositionSummary(
            symbol="INFY", quantity=Decimal("10"), avg_buy_price=Decimal("1500"),
            current_price=MOCK_PRICES["INFY"],
            pnl=(MOCK_PRICES["INFY"] - Decimal("1500")) * 10,
            pnl_percent=((MOCK_PRICES["INFY"] - Decimal("1500")) / Decimal("1500") * 100).quantize(Decimal("0.01")),
        ),
    ]
    total_invested = sum(p.avg_buy_price * p.quantity for p in positions)
    current_value  = sum(p.current_price * p.quantity for p in positions)
    total_pnl      = current_value - total_invested
    pnl_percent    = (total_pnl / total_invested * 100).quantize(Decimal("0.01")) if total_invested else Decimal("0")
    return PortfolioSummary(total_invested=total_invested, current_value=current_value,
                            total_pnl=total_pnl, pnl_percent=pnl_percent, positions=positions)


@router.get("/pnl-history", response_model=List[PnlHistory])
def pnl_history(days: int = 30, user=Depends(get_current_user)):
    today = date.today()
    return [
        PnlHistory(date=today - timedelta(days=d),
                   pnl=Decimal(str(round(500 + d * 10 - (d % 5) * 30, 2))))
        for d in range(days, 0, -1)
    ]


@router.get("/top-holdings")
def top_holdings(user=Depends(get_current_user)):
    portfolio = get_portfolio(user)
    sorted_pos = sorted(portfolio.positions, key=lambda p: p.current_price * p.quantity, reverse=True)
    return sorted_pos[:5]
