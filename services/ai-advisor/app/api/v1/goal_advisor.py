"""
AI Goal Planner — helps users set, simulate, and track financial goals.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Goal Planning"])

DISCLAIMER = (
    "AI projections are based on historical data and assumptions. "
    "Actual returns may differ significantly. This is not financial advice."
)


class GoalSimulationRequest(BaseModel):
    goal_type: str = Field(..., pattern="^(EMERGENCY_FUND|EDUCATION|HOUSE|CAR|RETIREMENT|VACATION|CUSTOM)$")
    target_amount: float = Field(..., gt=0)
    current_savings: float = Field(0, ge=0)
    monthly_sip: float = Field(0, ge=0)
    time_horizon_months: int = Field(..., ge=1, le=600)
    expected_return_rate: Optional[float] = Field(None, ge=0, le=100)  # annual %


class GoalSimulationResponse(BaseModel):
    goal_type: str
    target_amount: float
    projected_amount: float
    shortfall: float
    is_achievable: bool
    required_monthly_sip: float
    confidence_level: float      # probability of achieving goal at expected returns
    scenarios: list[dict]        # pessimistic / base / optimistic
    recommended_instruments: list[dict]
    disclaimer: str


class GoalRecommendationResponse(BaseModel):
    goal_id: str
    investment_plan: list[dict]
    rebalancing_schedule: str
    review_milestones: list[dict]
    ai_insights: str
    disclaimer: str


@router.post(
    "/goal-planner",
    response_model=GoalSimulationResponse,
    summary="Simulate a financial goal with SIP projections and instrument recommendations",
)
async def simulate_goal(
    body: GoalSimulationRequest,
    token: dict = Depends(verify_token),
) -> GoalSimulationResponse:
    # TODO: run Monte Carlo simulations + Claude for narrative
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="TODO: implement")


@router.get(
    "/recommendations",
    summary="Personalised AI investment recommendations based on risk profile and goals",
)
async def get_recommendations(
    limit: int = 5,
    token: dict = Depends(verify_token),
) -> list[dict]:
    # TODO: fetch user risk profile + goals, run recommendation engine with Claude
    return []


@router.get(
    "/goals/{goal_id}/recommendation",
    response_model=GoalRecommendationResponse,
    summary="AI-generated investment plan to achieve a specific goal",
)
async def goal_recommendation(
    goal_id: str,
    token: dict = Depends(verify_token),
) -> GoalRecommendationResponse:
    # TODO: fetch goal, generate personalised plan
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="TODO: implement")
