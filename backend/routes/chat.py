 
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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
 
ALL_TOPICS = ["DSA", "OS", "DBMS", "OOP", "CN", "C", "CPP", "JAVA", "CA", "SAD", "AI"]
FREE_TOPICS = ["DSA", "OOP", "CN", "C", "CPP", "JAVA", "SAD", "AI"]




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
    next_question: str | None = None
    score: int | None = None


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
    "CN": ["tcp", "udp", "ip", "layer", "osi", "protocol", "http", "https", "dns", "router", "switch", "port", "packet", "connection", "handshake", "url", "client", "server", "mac", "network"],
    "C": ["pointer", "malloc", "calloc", "free", "memory", "struct", "dangling", "leak", "header", "include", "preprocessor", "address", "null", "array", "string", "buffer", "sizeof"],
    "CPP": ["class", "object", "stl", "vector", "template", "virtual", "polymorphism", "reference", "smart", "pointer", "unique_ptr", "shared_ptr", "namespace", "rtti", "friend", "destructor", "encapsulation", "inheritance", "overloading", "overriding"],
    "JAVA": ["jvm", "jre", "jdk", "garbage", "collection", "collector", "heap", "stack", "string", "immutable", "thread", "runnable", "sync", "synchronized", "interface", "abstract", "hashmap", "equals", "hashcode", "stream", "lambda", "generics"],
    "CA": ["cpu", "pipeline", "pipelining", "cache", "l1", "l2", "memory", "register", "alu", "instruction", "risc", "cisc", "hazard", "bus", "clock", "architecture"],
    "SAD": ["sdlc", "agile", "waterfall", "dfd", "data", "flow", "diagram", "use", "case", "requirement", "functional", "non-functional", "testing", "feasibility", "system", "design"],
    "AI": ["machine", "learning", "supervised", "unsupervised", "neural", "network", "deep", "learning", "heuristic", "a*", "search", "overfitting", "training", "model", "classification", "regression", "agent"],
}



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
    
    # Code snippet symbols shouldn't trigger gibberish (e.g. `#include`, `{`, `}`, `;`, `int main()`)
    code_syntax_chars = [';', '{', '}', '(', ')', '<', '>', '=', '#', '[', ']']
    if any(c in t for c in code_syntax_chars):
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


def evaluate_offline_answer(question: str, user_answer: str, topic: str) -> tuple[str, int]:
    """Smart evaluator returning feedback message and integer score (0-10)."""
    if is_gibberish(user_answer):
        return (
            "Invalid or unrecognized response. Please enter a clear technical answer or code solution.",
            0,
        )

    if is_dont_know_or_invalid(user_answer):
        return (
            f"No worries! Review the core principles, algorithms, and complexity of {topic} to improve.",
            0,
        )

    text_words = set(re.findall(r"\b\w+\b", user_answer.lower()))
    keywords = TOPIC_KEYWORDS.get(topic, [])

    matched_topic_kw = [w for w in keywords if w in text_words]

    if len(matched_topic_kw) >= 3:
        return (
            f"Solid technical answer! You properly referenced key concepts like ({', '.join(matched_topic_kw[:3])}).",
            9,
        )
    elif len(matched_topic_kw) >= 1:
        return (
            f"Decent attempt mentioning {', '.join(matched_topic_kw[:2])}. Elaborate more on trade-offs and detailed mechanisms.",
            7,
        )
    elif len(text_words) >= 10:
        return (
            "You provided a general answer, but it lacks specific technical terminology for this topic.",
            2,
        )
    else:
        return (
            "Incorrect or non-technical response. Please include relevant technical concepts for credit.",
            0,
        )


async def call_gemini_eval(prompt: str) -> str:
    """Evaluate interview answer using Gemini API when available."""
    if not GEMINI_API_KEY:
        raise Exception("No Gemini API key")
    
    payload = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "maxOutputTokens": 300,
            "temperature": 0.3,
        }
    }
    candidate_models = [GEMINI_MODEL, "gemini-1.5-flash", "gemini-2.0-flash-lite", "gemini-2.0-flash", "gemini-2.5-flash"]
    async with httpx.AsyncClient(timeout=15.0) as client:
        for model in candidate_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={GEMINI_API_KEY}"
            try:
                res = await client.post(url, json=payload, headers={"Content-Type": "application/json"})
                if res.status_code == 200:
                    data = res.json()
                    parts = data.get("candidates", [])[0].get("content", {}).get("parts", [])
                    return parts[0].get("text", "").strip()
            except Exception:
                continue
    raise Exception("Gemini eval failed")


async def call_ollama(messages: list[dict]) -> str:
    payload = {
        "model": OLLAMA_MODEL,
        "messages": messages,
        "stream": False,
        "options": {
            "num_predict": 120,
            "temperature": 0.3,
            "top_k": 20,
            "num_ctx": 512,
        },
    }
    async with httpx.AsyncClient(timeout=2.5) as client:
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

        raw_content = payload.content

        user_message = Message(session_id=session.id, role="user", content=raw_content)
        db.add(user_message)
        db.commit()

        # Fetch all session messages
        history = (
            db.query(Message)
            .filter(Message.session_id == session.id)
            .order_by(Message.id.asc())
            .all()
        )

        # Get asked bot questions
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
        if is_casual_or_offtopic(raw_content):
            reply = f"Hello! Let's stay focused on our current question:\n\"{last_bot_question}\"\n\nPlease type your technical explanation when you are ready!"
            bot_message = Message(session_id=session.id, role="bot", content=reply, score=None)
            db.add(bot_message)
            db.commit()
            return SendMessageResponse(reply=reply, next_question=last_bot_question, score=None)

        # 2. Check gibberish / invalid / don't know
        score_val = 0
        if is_gibberish(raw_content):
            reply = "Invalid or unrecognized response. Please enter a clear technical answer or code solution."
            score_val = 0
        elif is_dont_know_or_invalid(raw_content):
            reply = f"No worries! Review the core principles and algorithms of {session.topic} to improve."
            score_val = 0
        else:
            # 3. Process evaluation via Gemini Cloud LLM, Ollama LLM, or smart keyword engine
            recent_history = history[-4:]
            eval_prompt = (
                f"You are a strict technical interviewer evaluating an answer for topic: {session.topic}.\n"
                f"Question asked: '{last_bot_question}'.\n"
                f"Candidate's answer: '{raw_content}'.\n"
                f"Provide 2-3 sentences of constructive feedback. Be strict. Rate the answer strictly from 0 to 10. "
                f"If the answer is incorrect, partial, or lacks technical depth, give a low score (0-4). "
                f"Do not give high scores (7-10) unless the answer is completely accurate and detailed. "
                f"Include 'Score: X/10' in your response."
            )
            ollama_messages = [
                {
                    "role": "system",
                    "content": eval_prompt
                }
            ]
            for msg in recent_history:
                role = "assistant" if msg.role == "bot" else "user"
                ollama_messages.append({"role": role, "content": msg.content})

            evaluated = False

            # 3a. Try Gemini Cloud AI
            if GEMINI_API_KEY:
                try:
                    raw_reply = await call_gemini_eval(eval_prompt)
                    match = re.search(r"Score:\s*(\d{1,2})\s*/\s*10", raw_reply, re.IGNORECASE)
                    if match:
                        score_val = max(0, min(10, int(match.group(1))))
                        reply = re.sub(r"Score:\s*\d{1,2}\s*/\s*10", "", raw_reply).strip()
                        evaluated = True
                except Exception:
                    pass

            # 3b. Try Ollama if Gemini not evaluated
            if not evaluated:
                try:
                    raw_reply = await call_ollama(ollama_messages)
                    match = re.search(r"Score:\s*(\d{1,2})\s*/\s*10", raw_reply, re.IGNORECASE)
                    if match:
                        score_val = max(0, min(10, int(match.group(1))))
                        reply = re.sub(r"Score:\s*\d{1,2}\s*/\s*10", "", raw_reply).strip()
                        evaluated = True
                except Exception:
                    pass

            # 3c. Fallback to smart offline keyword engine
            if not evaluated:
                reply, score_val = evaluate_offline_answer(last_bot_question, raw_content, session.topic)

        # Save evaluation message to DB with score
        bot_eval = Message(session_id=session.id, role="bot", content=reply, score=score_val)
        db.add(bot_eval)

        # Save next question message to DB
        bot_next = Message(session_id=session.id, role="bot", content=next_q, score=None)
        db.add(bot_next)

        db.commit()

        return SendMessageResponse(reply=reply, next_question=next_q, score=score_val)
    except HTTPException:
        raise
    except Exception as exc:
        fallback_reply = "Keep practicing! Review the problem constraints carefully."
        return SendMessageResponse(reply=fallback_reply, next_question="What are the main considerations for solving this type of problem?", score=5)


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
    total_questions = len(scores)
    avg_score = round(sum(scores) / len(scores), 1) if scores else 0.0
    
    if avg_score >= 8.0:
        summary = f"🌟 Excellent performance ({avg_score}/10) in {session.topic}! You demonstrated strong problem-solving skills and technical depth."
    elif avg_score >= 5.0:
        summary = f"👍 Good job ({avg_score}/10) in {session.topic}! You answered core questions well with minor opportunities for detail enhancement."
    else:
        summary = f"📚 Completed {session.topic} session ({avg_score}/10). Review core concepts and practice step-by-step problem explanations."

    return EndSessionResponse(
        session_id=session.id,
        topic=session.topic,
        total_questions=total_questions,
        average_score=avg_score,
        summary=summary,
    )

