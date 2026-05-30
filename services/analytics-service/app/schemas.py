from datetime import date, datetime
from decimal import Decimal
from typing import List

from pydantic import BaseModel


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


class PortfolioSummary(BaseModel):
    total_invested: Decimal
    current_value: Decimal
    total_pnl: Decimal
    pnl_percent: Decimal
    positions: List[PositionSummary]


class PnlHistory(BaseModel):
    date: date
    pnl: Decimal
