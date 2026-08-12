 
import os
import random
import re

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, Question, InterviewSession, Message
from routes.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:1b")
 
ALL_TOPICS = ["DSA", "OS", "DBMS", "OOP", "CN"]
FREE_TOPICS = ["DSA", "OOP", "CN"]

SYSTEM_PROMPT = (
    "You are a strict technical interview evaluator for software engineering roles. "
    "Evaluate the user's answer to the asked interview question. "
    "Rules: "
    "1. Always start your response with 'Score: X/10' on line 1. "
    "2. If the user says 'I don't know', 'idk', gives an incorrect answer, or gives an incomplete answer: "
    "assign a low score (0/10 to 3/10) AND provide a clear 2-sentence explanation of the correct answer to the question asked. "
    "3. If the user gives a good answer, assign 7/10 to 10/10 and briefly mention key strengths."
)

 
class StartSessionRequest(BaseModel):
    topic: str


class StartSessionResponse(BaseModel):
    session_id: int
    topic: str
    question: str
    user_name: str | None = None


class SendMessageRequest(BaseModel):
    session_id: int
    content: str


class SendMessageResponse(BaseModel):
    reply: str
    score: int | None = None
    next_question: str | None = None


class EndSessionRequest(BaseModel):
    session_id: int


class EndSessionResponse(BaseModel):
    session_id: int
    topic: str
    total_questions: int
    average_score: float | None
    summary: str


TOPIC_KEYWORDS = {
    "DSA": ["array", "list", "linked", "tree", "node", "hash", "table", "key", "value", "binary", "search", "time", "complexity", "space", "o(1)", "o(n)", "log", "queue", "stack", "recursion", "heap", "graph", "bfs", "dfs", "sort", "pointer", "memory", "index", "element", "data", "structure"],
    "OS": ["process", "thread", "memory", "virtual", "cpu", "deadlock", "mutex", "semaphore", "page", "paging", "segmentation", "scheduling", "preemptive", "context", "switch", "race", "condition", "lock", "kernel", "os", "hardware"],
    "DBMS": ["table", "key", "primary", "foreign", "index", "sql", "nosql", "join", "inner", "left", "acid", "transaction", "normalize", "normalization", "database", "query", "row", "column", "record", "relation"],
    "OOP": ["class", "object", "constructor", "destructor", "inheritance", "polymorphism", "encapsulation", "overloading", "overriding", "abstract", "interface", "virtual", "method", "function", "private", "public", "protected", "instance"],
    "CN": ["tcp", "udp", "ip", "layer", "osi", "protocol", "http", "https", "dns", "router", "switch", "port", "packet", "connection", "handshake", "url", "client", "server", "mac", "network"]
}


 
def extract_score(text: str) -> int | None:
    """Pull a 1-10 score out of the model's reply, e.g. 'Score: 7/10'."""
    match = re.search(r"(\d{1,2})\s*/\s*10", text)
    if not match:
        return None
    score = int(match.group(1))
    return max(0, min(10, score))


def is_casual_or_offtopic(text: str) -> bool:
    """Detect if text is a casual greeting or generic non-answer."""
    t = text.strip().lower()
    casual_words = {
        "hey", "hi", "hello", "hlo", "hy", "sup", "yo", "hola",
        "how are you", "who are you", "what is your name", "who r u",
        "test", "ok", "k", "thanks", "thank you", "bye", "end", "what"
    }
    if t in casual_words:
        return True
    if len(t) < 3 and t not in {"dsa", "sql", "bfs", "dfs", "tcp", "udp", "avl", "oop", "cpu", "os", "cn", "ram"}:
        return True
    return False


def is_dont_know_or_invalid(text: str) -> bool:
    """Detect if user expressed lack of knowledge or invalid non-technical response."""
    t = text.strip().lower()
    dont_know_phrases = {
        "i dont know", "i don't know", "idk", "dont know", "don't know",
        "no idea", "no concept", "janina", "jani na", "vule geci", "vule gachi",
        "dunno", "pass", "skip", "no answer", "nothing", "not sure",
        "i am not sure", "i'm not sure", "have no idea"
    }
    if t in dont_know_phrases:
        return True
    for phrase in ["i dont know", "i don't know", "idk", "no idea", "jani na", "janina", "vule geci"]:
        if phrase in t:
            return True
    return False


def is_gibberish(text: str) -> bool:
    """Detect nonsense/keyboard mashing like 'Skfmkdf;dfd;', 'heynnvcgjknvv', 'asdfghjkl'."""
    t = text.strip().lower()
    if len(t) < 3:
        return False
    
    # 1. Non-alphanumeric character checks (like ;, #, $, %)
    letters = [ch for ch in t if ch.isalpha()]
    if not letters:
        return True
    
    # 2. Vowel ratio in alphabetic characters
    vowels = [ch for ch in letters if ch in "aeiouy"]
    vowel_ratio = len(vowels) / len(letters)
    
    if len(letters) >= 5 and vowel_ratio < 0.15:
        return True
        
    # 3. Absurdly long consonant sequences (e.g. 5+ consonants in a row)
    consonant_count = 0
    for ch in t:
        if ch.isalpha() and ch not in "aeiouy":
            consonant_count += 1
            if consonant_count >= 5:
                return True
        else:
            consonant_count = 0
            
    # 4. Repeated characters (e.g. 'aaaaa', 'ffff')
    if re.search(r"(.)\1{4,}", t):
        return True

    return False


def evaluate_offline_answer(question: str, user_answer: str, topic: str) -> tuple[int, str]:
    """Smart offline evaluator for scoring when Ollama LLM is unavailable."""
    if is_gibberish(user_answer):
        return (0, "Invalid or unrecognized response. Please enter a clear technical answer to score points.")
    
    if is_dont_know_or_invalid(user_answer):
        return (0, f"No worries! Key takeaway: Review the core principles, syntax, and trade-offs of {topic}.")

    text_words = set(re.findall(r"\b\w+\b", user_answer.lower()))
    keywords = TOPIC_KEYWORDS.get(topic, [])
    
    # Extract words from question to check if user addressed question terms
    question_words = set(re.findall(r"\b\w+\b", question.lower())) - {"what", "is", "a", "an", "the", "how", "does", "it", "differ", "from", "explain", "describe", "and", "or", "to", "in", "of", "used"}
    
    matched_topic_kw = [w for w in keywords if w in text_words]
    matched_question_kw = [w for w in question_words if w in text_words]
    
    total_matches = len(matched_topic_kw) + len(matched_question_kw)
    word_count = len(text_words)

    if total_matches >= 3:
        score = min(10, 7 + min(3, total_matches - 3))
        reply = f"Solid technical answer! You properly referenced key concepts like ({', '.join(matched_topic_kw[:3])})."
    elif total_matches >= 1:
        score = random.randint(5, 6)
        reply = f"Decent attempt mentioning {', '.join(matched_topic_kw[:2])}. For full credit, elaborate more on trade-offs and detailed mechanisms."
    elif word_count >= 10:
        score = 3
        reply = "You provided a general answer, but it lacks specific technical terminology for this topic."
    else:
        score = 1
        reply = "Very brief response. Include key technical definitions and mechanisms for higher credit."

    return (score, reply)


async def call_ollama(messages: list[dict]) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "num_predict": 90,    # Tokens for score + concise correct explanation
            "temperature": 0.2,   # Fast low-temperature sampling
            "top_k": 20,
            "num_ctx": 512,       # Small context for maximum CPU speed
        },
    }
    # 1.5-second timeout so offline fallback responds instantly without lagging
    async with httpx.AsyncClient(timeout=1.5) as client:
        response = await client.post(f"{OLLAMA_URL}/api/chat", json=payload)
        response.raise_for_status()
        data = response.json()
        return data["message"]["content"]




def get_owned_session(session_id: int, user: User, db: Session) -> InterviewSession:
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


# --- Routes ----------------------------------------------------
@router.get("/topics")
def list_topics(current_user: User = Depends(get_current_user)):
    return [
        {"topic": topic, "locked": current_user.plan == "free" and topic not in FREE_TOPICS}
        for topic in ALL_TOPICS
    ]


@router.post("/start", response_model=StartSessionResponse)
def start_session(
    payload: StartSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    topic = payload.topic
    if topic not in ALL_TOPICS:
        raise HTTPException(status_code=400, detail="Unknown topic")
    if current_user.plan == "free" and topic not in FREE_TOPICS:
        raise HTTPException(status_code=403, detail="Upgrade to Pro to access this topic")

    questions = db.query(Question).filter(Question.topic == topic).all()
    if not questions:
        raise HTTPException(status_code=404, detail="No questions found for this topic")
    first_question = random.choice(questions).question_text

    session = InterviewSession(user_id=current_user.id, topic=topic)
    db.add(session)
    db.commit()
    db.refresh(session)

    bot_message = Message(session_id=session.id, role="bot", content=first_question)
    db.add(bot_message)
    db.commit()

    return StartSessionResponse(
        session_id=session.id,
        topic=topic,
        question=first_question,
        user_name=current_user.name
    )


@router.post("/message", response_model=SendMessageResponse)
async def send_message(
    payload: SendMessageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        session = get_owned_session(payload.session_id, current_user, db)

        # Save user message to database
        user_message = Message(session_id=session.id, role="user", content=payload.content)
        db.add(user_message)
        db.commit()

        # Fetch all session messages
        history = (
            db.query(Message)
            .filter(Message.session_id == session.id)
            .order_by(Message.id.asc())
            .all()
        )
        
        # Get asked bot questions (ignore bot evaluation feedback messages)
        asked_questions = [m.content for m in history if m.role == "bot" and m.score is None and not m.content.startswith("Hello") and not m.content.startswith("Let's focus")]
        last_bot_question = asked_questions[-1] if asked_questions else f"What are key concepts of {session.topic}?"

        # Pick next question from DB bank
        all_topic_questions = db.query(Question).filter(Question.topic == session.topic).all()
        asked_texts = set(asked_questions)
        unasked = [q for q in all_topic_questions if q.question_text not in asked_texts]
        
        if unasked:
            next_q = random.choice(unasked).question_text
        elif all_topic_questions:
            next_q = random.choice(all_topic_questions).question_text
        else:
            next_q = f"Can you elaborate on key mechanisms and complexity for {session.topic}?"

        # 1. Handle casual greetings (e.g. "hi", "hello")
        if is_casual_or_offtopic(payload.content):
            reply = f"Hello! Let's stay focused on our current question:\n\"{last_bot_question}\"\n\nPlease type your technical explanation when you are ready!"
            bot_message = Message(session_id=session.id, role="bot", content=reply, score=None)
            db.add(bot_message)
            db.commit()
            return SendMessageResponse(reply=reply, score=None, next_question=last_bot_question)

        # 2. Process evaluation via Ollama LLM (or smart local offline fallback)
        recent_history = history[-4:]
        ollama_messages = [
            {
                "role": "system", 
                "content": f"{SYSTEM_PROMPT}\nTopic: {session.topic}.\nQuestion asked: '{last_bot_question}'."
            }
        ]
        for msg in recent_history:
            role = "assistant" if msg.role == "bot" else "user"
            ollama_messages.append({"role": role, "content": msg.content})

        score = None
        reply = ""

        try:
            raw_reply = await call_ollama(ollama_messages)
            score = extract_score(raw_reply)
            clean_reply = re.sub(r"Score:\s*\d{1,2}\s*/\s*10", "", raw_reply).strip()
            reply = clean_reply if clean_reply else "Review core concepts of this topic for software engineering interviews."
        except Exception:
            # Smart local offline fallback evaluation
            score, reply = evaluate_offline_answer(last_bot_question, payload.content, session.topic)

        # Save evaluation message to DB
        bot_eval = Message(session_id=session.id, role="bot", content=reply, score=score)
        db.add(bot_eval)

        # Save next question message to DB
        bot_next = Message(session_id=session.id, role="bot", content=next_q, score=None)
        db.add(bot_next)
        
        db.commit()

        return SendMessageResponse(reply=reply, score=score, next_question=next_q)
    except HTTPException:
        raise
    except Exception as exc:
        fallback_reply = "Thank you for your response! Here is the next question to practice."
        return SendMessageResponse(reply=fallback_reply, score=0, next_question="What are main trade-offs in this approach?")




@router.post("/end", response_model=EndSessionResponse)
def end_session(
    payload: EndSessionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    session = get_owned_session(payload.session_id, current_user, db)
    
    bot_messages = (
        db.query(Message)
        .filter(Message.session_id == session.id, Message.role == "bot")
        .all()
    )
    
    scores = [m.score for m in bot_messages if m.score is not None]
    total_questions = len(bot_messages)
    avg_score = round(sum(scores) / len(scores), 1) if scores else None
    
    if avg_score is not None:
        if avg_score >= 8.0:
            summary = f"Excellent performance in {session.topic}! You demonstrated strong problem-solving skills and technical depth."
        elif avg_score >= 5.0:
            summary = f"Good job in {session.topic}! You answered core questions well with minor opportunities for detail enhancement."
        else:
            summary = f"Completed {session.topic} session. Review core concepts and practice step-by-step problem explanations."
    else:
        summary = f"Completed {session.topic} interview session."

    return EndSessionResponse(
        session_id=session.id,
        topic=session.topic,
        total_questions=total_questions,
        average_score=avg_score,
        summary=summary,
    )

