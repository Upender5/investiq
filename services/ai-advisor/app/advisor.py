import json
import logging
import re

from langchain_anthropic import ChatAnthropic
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, HumanMessagePromptTemplate

from app.config import Settings

logger = logging.getLogger(__name__)

# System prompt is stable → mark for Anthropic prompt caching (ephemeral, 5-min TTL).
# This avoids billing the full system-prompt token cost on every repeated call.
_SYSTEM_PROMPT = """You are InvestIQ's AI financial advisor, specialising in investment guidance \
for Indian college students. You combine financial expertise with an understanding of the constraints \
college students face: limited income, no credit history, long investment horizon.

Respond ONLY with a valid JSON object — no markdown, no preamble — with exactly these three fields:
{
  "recommendation": "<clear, actionable investment recommendation>",
  "reasoning": "<financial rationale behind the recommendation>",
  "disclaimer": "<standard risk disclaimer>"
}

Investment universe by risk profile:
- conservative  → FDs, PPF, NPS Tier-II, Sovereign Gold Bonds, Liquid Mutual Funds
- moderate      → Index Funds (Nifty 50 / Nifty Next 50), Balanced Advantage Funds, SIP in diversified equity MFs
- aggressive    → Sectoral / Thematic Equity MFs, Direct Equity SIPs, Small-cap funds

Rules:
1. Minimum investment is ₹10.
2. Recommend only SEBI-registered products.
3. All amounts in Indian Rupees (₹).
4. Tailor advice to the student context — liquidity needs, zero income-tax exemption limit, no lock-in preference.
5. The disclaimer field must always remind the user this is AI-generated, not professional advice, \
and that all investments carry market risk.
"""

_HUMAN_TEMPLATE = """\
User context:
- Risk profile : {risk_profile}
- Investment budget: ₹{budget_inr}

Question: {question}

Return a JSON object with keys recommendation, reasoning, disclaimer."""


class AdvisorService:
    """LangChain pipeline: ChatPromptTemplate → ChatAnthropic → JSON parse."""

    def __init__(self, settings: Settings) -> None:
        # System message with cache_control — instructs Anthropic to cache this prefix.
        # langchain-anthropic forwards additional_kwargs to the Anthropic SDK message.
        self._system_msg = SystemMessage(
            content=_SYSTEM_PROMPT,
            additional_kwargs={"cache_control": {"type": "ephemeral"}},
        )

        self._llm = ChatAnthropic(
            model=settings.claude_model,
            anthropic_api_key=settings.anthropic_api_key,
            max_tokens=1024,
        )

        # Build a re-usable prompt template for the human turn.
        self._prompt = ChatPromptTemplate.from_messages([
            HumanMessagePromptTemplate.from_template(_HUMAN_TEMPLATE),
        ])

    async def recommend(self, risk_profile: str, budget_inr: float, question: str) -> dict:
        human_msg: HumanMessage = (
            self._prompt.format_messages(
                risk_profile=risk_profile,
                budget_inr=f"{budget_inr:,.2f}",
                question=question,
            )[0]
        )

        response = await self._llm.ainvoke([self._system_msg, human_msg])
        return self._parse(response.content)

    @staticmethod
    def _parse(content: str) -> dict:
        """Extract JSON from the model response, tolerating minor formatting noise."""
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            pass

        # Strip markdown code fences if present
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", content, re.DOTALL)
        if match:
            return json.loads(match.group(1))

        # Last resort: find the outermost {...}
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            return json.loads(match.group())

        raise ValueError(f"Could not parse JSON from model response: {content[:200]}")
