
import os
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, AskAIConversation, AskAIMessage
from routes.auth import get_current_user

router = APIRouter(prefix="/api/ask-ai", tags=["ask-ai"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
OLLAMA_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "90"))
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

ASK_AI_SYSTEM_PROMPT = (
    "You are Zigo AI, a friendly and expert assistant for computer science, programming, "
    "and interview preparation. Answer clearly like ChatGPT: use short paragraphs, bullet points "
    "when helpful, and code examples for programming questions. Be accurate, practical, and "
    "encourage the user. If you are unsure, say so honestly instead of guessing."
)


# ── Pydantic schemas ──────────────────────────────────────────

class ConversationOut(BaseModel):
    id: int
    title: str
    created_at: str | None = None


class MessageOut(BaseModel):
    id: int
    role: str
    content: str
    created_at: str | None = None


class AskRequest(BaseModel):
    conversation_id: int
    content: str


class AskResponse(BaseModel):
    reply: str
    conversation_id: int
    conversation_title: str
    provider: str = "offline"


class AIStatusResponse(BaseModel):
    ollama_available: bool
    gemini_available: bool
    active_provider: str
    model: str


# ── Helpers ────────────────────────────────────────────────────

def _make_title(text: str) -> str:
    """Generate a short conversation title from the first user message."""
    clean = re.sub(r"\s+", " ", text.strip())
    if len(clean) <= 50:
        return clean
    return clean[:47] + "..."


async def _check_ollama_available() -> bool:
    """Return True when Ollama is reachable and the configured model is available."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{OLLAMA_URL}/api/tags")
            response.raise_for_status()
            models = response.json().get("models", [])
            model_names = {m.get("name", "").split(":")[0] for m in models}
            configured = OLLAMA_MODEL.split(":")[0]
            return configured in model_names or any(
                m.get("name", "").startswith(configured) for m in models
            )
    except Exception:
        return False


async def _call_ollama_ask(messages: list[dict]) -> str:
    """Call Ollama for free-form Ask AI chat."""
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "num_predict": 800,
            "temperature": 0.7,
            "top_k": 40,
            "top_p": 0.9,
            "num_ctx": 4096,
        },
    }
    async with httpx.AsyncClient(timeout=OLLAMA_TIMEOUT) as client:
        response = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        content = data.get("message", {}).get("content", "").strip()
        if not content:
            raise Exception("Ollama returned an empty response")
        return content


async def _call_gemini_ask(messages: list[dict]) -> str:
    """Call Google Gemini API as fallback when configured."""
    if not GEMINI_API_KEY:
        raise Exception("No Gemini API key configured")

    system_text = ""
    gemini_contents = []

    for msg in messages:
        if msg["role"] == "system":
            system_text = msg["content"]
        elif msg["role"] in ("user", "assistant"):
            g_role = "user" if msg["role"] == "user" else "model"
            text_content = (msg.get("content") or "").strip()
            if not text_content:
                continue

            if gemini_contents and gemini_contents[-1]["role"] == g_role:
                gemini_contents[-1]["parts"][0]["text"] += f"\n\n{text_content}"
            else:
                gemini_contents.append({
                    "role": g_role,
                    "parts": [{"text": text_content}]
                })

    if not gemini_contents:
        raise Exception("No user messages to send")

    if gemini_contents[0]["role"] == "model":
        gemini_contents.insert(0, {"role": "user", "parts": [{"text": "Hello"}]})

    payload = {
        "contents": gemini_contents,
        "generationConfig": {
            "maxOutputTokens": 1000,
            "temperature": 0.7,
        }
    }

    if system_text:
        payload["system_instruction"] = {
            "parts": [{"text": system_text}]
        }

    candidate_models = [GEMINI_MODEL, "gemini-3.6-flash", "gemini-2.5-flash", "gemini-flash-latest"]
    unique_models = list(dict.fromkeys(candidate_models))

    last_error = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for model in unique_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            try:
                response = await client.post(
                    url,
                    json=payload,
                    headers={"Content-Type": "application/json"}
                )
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text_parts = [p.get("text", "") for p in parts if "text" in p]
                        if text_parts:
                            return "\n".join(text_parts).strip()
            except Exception as e:
                last_error = e

    raise last_error or Exception("Gemini API request failed across candidate models")


async def _call_cloud_free_ask(messages: list[dict]) -> str:
    """Call free public cloud AI API (Pollinations AI) as automatic fallback."""
    clean_msgs = []
    for m in messages:
        role = m.get("role", "user")
        if role not in ("system", "user", "assistant"):
            role = "user"
        clean_msgs.append({"role": role, "content": m.get("content", "")})

    payload = {
        "messages": clean_msgs,
        "model": "openai",
        "temperature": 0.7
    }

    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/plain, application/json",
        "Content-Type": "application/json"
    }

    async with httpx.AsyncClient(timeout=25.0, headers=headers) as client:
        res = await client.post("https://text.pollinations.ai/", json=payload)
        res.raise_for_status()
        text = res.text.strip()
        if not text:
            raise Exception("Cloud AI returned an empty response")
        return text


async def _get_ai_reply(messages: list[dict]) -> tuple[str, str]:
    """Try Gemini first (if key configured), then Ollama (local), then Free Cloud AI fallback."""
    # 1. Try Google Gemini API if key is set
    if GEMINI_API_KEY:
        try:
            return await _call_gemini_ask(messages), "gemini"
        except Exception as e:
            print(f"[Ask AI] Gemini call failed: {e}")

    # 2. Try Ollama (local LLM)
    try:
        return await _call_ollama_ask(messages), "ollama"
    except Exception as e:
        print(f"[Ask AI] Ollama call failed: {e}")

    # 3. Free Cloud AI Fallback (Works on Render / Mobile APK without any key required)
    try:
        return await _call_cloud_free_ask(messages), "cloud-ai"
    except Exception as e:
        print(f"[Ask AI] Cloud AI fallback failed: {e}")

    # 4. Fallback message if all offline/network calls fail
    return (
        "I'm currently unable to connect to the AI network. Please check your internet connection and try again."
    ), "offline"


# ── Routes ─────────────────────────────────────────────────────

@router.get("/status", response_model=AIStatusResponse)
async def ai_status():
    """Report which AI provider is available for Ask AI."""
    ollama_ok = await _check_ollama_available()
    gemini_ok = bool(GEMINI_API_KEY)

    if gemini_ok:
        active = "gemini"
        model = GEMINI_MODEL
    elif ollama_ok:
        active = "ollama"
        model = OLLAMA_MODEL
    else:
        active = "cloud-ai"
        model = "gpt-4o-mini (Cloud AI)"

    return AIStatusResponse(
        ollama_available=ollama_ok,
        gemini_available=gemini_ok,
        active_provider=active,
        model=model,
    )


@router.get("/conversations", response_model=list[ConversationOut])
def list_conversations(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all Ask AI conversations for the current user, newest first."""
    convos = (
        db.query(AskAIConversation)
        .filter(AskAIConversation.user_id == current_user.id)
        .order_by(AskAIConversation.created_at.desc())
        .all()
    )
    return [
        ConversationOut(
            id=c.id,
            title=c.title,
            created_at=str(c.created_at) if c.created_at else None,
        )
        for c in convos
    ]


@router.post("/conversations", response_model=ConversationOut)
def create_conversation(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create a new empty Ask AI conversation."""
    convo = AskAIConversation(user_id=current_user.id, title="New Chat")
    db.add(convo)
    db.commit()
    db.refresh(convo)
    return ConversationOut(
        id=convo.id,
        title=convo.title,
        created_at=str(convo.created_at) if convo.created_at else None,
    )


@router.get("/conversations/{conversation_id}/messages", response_model=list[MessageOut])
def get_messages(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Return all messages for a conversation owned by the current user."""
    convo = (
        db.query(AskAIConversation)
        .filter(AskAIConversation.id == conversation_id, AskAIConversation.user_id == current_user.id)
        .first()
    )
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    msgs = (
        db.query(AskAIMessage)
        .filter(AskAIMessage.conversation_id == conversation_id)
        .order_by(AskAIMessage.id.asc())
        .all()
    )
    return [
        MessageOut(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=str(m.created_at) if m.created_at else None,
        )
        for m in msgs
    ]


@router.post("/ask", response_model=AskResponse)
async def ask_ai(
    payload: AskRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Send a user question, get an AI reply, and persist both to the DB."""
    convo = (
        db.query(AskAIConversation)
        .filter(AskAIConversation.id == payload.conversation_id, AskAIConversation.user_id == current_user.id)
        .first()
    )
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    # Save user message
    user_msg = AskAIMessage(conversation_id=convo.id, role="user", content=payload.content)
    db.add(user_msg)
    db.commit()

    # Auto-title from first message
    if convo.title == "New Chat":
        convo.title = _make_title(payload.content)
        db.commit()

    # Build message history for AI (last 10 messages for context)
    history = (
        db.query(AskAIMessage)
        .filter(AskAIMessage.conversation_id == convo.id)
        .order_by(AskAIMessage.id.asc())
        .all()
    )

    ollama_messages = [{"role": "system", "content": ASK_AI_SYSTEM_PROMPT}]

    # Use last 20 messages for ChatGPT-like conversation memory
    recent = history[-20:]
    for msg in recent:
        role = "assistant" if msg.role == "bot" else "user"
        ollama_messages.append({"role": role, "content": msg.content})

    # Call AI (Ollama -> Gemini -> offline fallback)
    reply_text, provider = await _get_ai_reply(ollama_messages)

    # Save bot reply
    bot_msg = AskAIMessage(conversation_id=convo.id, role="bot", content=reply_text)
    db.add(bot_msg)
    db.commit()

    return AskResponse(
        reply=reply_text,
        conversation_id=convo.id,
        conversation_title=convo.title,
        provider=provider,
    )


@router.delete("/conversations/{conversation_id}")
def delete_conversation(
    conversation_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Delete an Ask AI conversation and all its messages."""
    convo = (
        db.query(AskAIConversation)
        .filter(AskAIConversation.id == conversation_id, AskAIConversation.user_id == current_user.id)
        .first()
    )
    if not convo:
        raise HTTPException(status_code=404, detail="Conversation not found")

    db.delete(convo)
    db.commit()
    return {"detail": "Conversation deleted"}
