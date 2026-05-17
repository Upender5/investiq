import hashlib
import json
import logging

import redis.asyncio as aioredis

from app.config import Settings

logger = logging.getLogger(__name__)


class CacheService:
    def __init__(self, settings: Settings) -> None:
        url = f"redis://{settings.redis_host}:{settings.redis_port}"
        self._client = aioredis.from_url(
            url,
            password=settings.redis_password or None,
            decode_responses=True,
        )
        self._ttl = settings.cache_ttl_seconds

    def _key(self, user_id: str, risk_profile: str, budget_inr: float, question: str) -> str:
        raw = f"{user_id}:{risk_profile}:{budget_inr}:{question}"
        digest = hashlib.sha256(raw.encode()).hexdigest()
        return f"advisor:{digest}"

    async def get(self, user_id: str, risk_profile: str, budget_inr: float, question: str) -> dict | None:
        key = self._key(user_id, risk_profile, budget_inr, question)
        try:
            data = await self._client.get(key)
            if data:
                logger.debug("Cache hit for key %s", key)
                return json.loads(data)
        except Exception:
            logger.warning("Redis get failed", exc_info=True)
        return None

    async def set(self, user_id: str, risk_profile: str, budget_inr: float, question: str, response: dict) -> None:
        key = self._key(user_id, risk_profile, budget_inr, question)
        try:
            await self._client.setex(key, self._ttl, json.dumps(response))
        except Exception:
            logger.warning("Redis set failed", exc_info=True)
