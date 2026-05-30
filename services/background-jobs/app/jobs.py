import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

TOP_SYMBOLS = ["RELIANCE", "TCS", "INFY", "HDFCBANK", "SBIN",
               "WIPRO", "ICICIBANK", "BAJFINANCE", "MARUTI", "ITC"]


def refresh_market_cache():
    try:
        with httpx.Client(timeout=5) as client:
            resp = client.post(f"{settings.MARKET_DATA_SERVICE_URL}/api/v1/market/quotes/batch",
                               json=TOP_SYMBOLS)
            logger.info("Market cache refreshed: %d quotes", len(resp.json()))
    except Exception as e:
        logger.warning("Market cache refresh failed: %s", e)


def cleanup_stale_orders():
    logger.info("Checking for stale orders (PENDING > 10 min)...")
    # TODO: query trade-service for stale PENDING orders and cancel them


def send_daily_summaries():
    logger.info("Sending daily portfolio summaries to active users...")
    # TODO: fetch active users, compute P&L, dispatch notifications


def kyc_reminders():
    logger.info("Sending KYC reminders to pending users...")
    # TODO: query user-service for users with KYC_PENDING status older than 24h
