"""
AI Chat — conversational investment assistant backed by Claude.
Conversations are persisted in MongoDB with session isolation per user.
"""
import logging
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.config import Settings, get_settings
from app.security import verify_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai/chat", tags=["AI Chat"])

DISCLAIMER = (
    "This AI response is for educational purposes only and does not constitute "
    "financial advice. Please consult a SEBI-registered investment advisor before "
    "making investment decisions."
)


class ChatMessage(BaseModel):
    role: str = Field(..., pattern="^(user|assistant)$")
    content: str


class ChatRequest(BaseModel):
    conversation_id: Optional[str] = None  # None = start new conversation
    message: str = Field(..., min_length=1, max_length=2000)
    context: Optional[dict] = None  # optional user portfolio context to inject


class ChatResponse(BaseModel):
    conversation_id: str
    message: str
    disclaimer: str
    citations: list[str] = []
    suggestions: list[str] = []  # follow-up question suggestions


class ConversationSummary(BaseModel):
    id: str
    title: str
    message_count: int
    last_message_at: str
    created_at: str


@router.post("", response_model=ChatResponse, summary="Send a message to the AI investment advisor")
async def chat(
    body: ChatRequest,
    token: dict = Depends(verify_token),
    settings: Settings = Depends(get_settings),
) -> ChatResponse:
    user_id = token.get("sub")
    # TODO: load conversation from MongoDB if body.conversation_id is set,
    #       call Claude with conversation history + system prompt,
    #       persist response and return
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="TODO: implement")


@router.get(
    "/conversations",
    response_model=list[ConversationSummary],
    summary="List all chat conversations for the authenticated user",
)
async def list_conversations(
    token: dict = Depends(verify_token),
) -> list[ConversationSummary]:
    # TODO: query MongoDB conversations collection filtered by user_id
    return []


@router.get(
    "/conversations/{conversation_id}",
    response_model=list[ChatMessage],
    summary="Get the full message history for a conversation",
)
async def get_conversation(
    conversation_id: str,
    token: dict = Depends(verify_token),
) -> list[ChatMessage]:
    # TODO: fetch from MongoDB, verify ownership
    return []


@router.delete(
    "/conversations/{conversation_id}",
    status_code=204,
    summary="Delete a conversation and its history",
)
async def delete_conversation(
    conversation_id: str,
    token: dict = Depends(verify_token),
) -> None:
    # TODO: soft-delete in MongoDB
    pass
