from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class RiskProfile(str, Enum):
    CONSERVATIVE = "conservative"
    MODERATE = "moderate"
    AGGRESSIVE = "aggressive"


class AdvisorRequest(BaseModel):
    user_id: UUID
    risk_profile: RiskProfile
    budget_inr: float = Field(gt=0, description="Investment budget in Indian Rupees")
    question: str = Field(min_length=10, max_length=1000)


class AdvisorResponse(BaseModel):
    recommendation: str
    reasoning: str
    disclaimer: str
