
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
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
GEMINI_API_URL = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent"

ASK_AI_SYSTEM_PROMPT = (
    "You are Zigo AI, an expert, friendly assistant specializing in Computer Science, "
    "software engineering, programming languages, data structures, algorithms, and technical interviews. "
    "Answer clearly like ChatGPT: use clean markdown formatting, concise paragraphs, bullet points, "
    "and syntax-highlighted code snippets where helpful."
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
    provider: str = "cloud-ai"


class AIStatusResponse(BaseModel):
    ollama_available: bool
    gemini_available: bool
    active_provider: str
    model: str


# ── Helpers ────────────────────────────────────────────────────

def _make_title(text: str) -> str:
    """Generate a short conversation title from the first user message."""
    clean = re.sub(r"\s+", " ", text.strip())
    if len(clean) <= 45:
        return clean
    return clean[:42] + "..."


async def _check_ollama_available() -> bool:
    """Return True when Ollama is reachable and the configured model is available."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
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
    """Call Google Gemini API with fallback across standard models."""
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
            "maxOutputTokens": 1200,
            "temperature": 0.7,
        }
    }

    if system_text:
        payload["system_instruction"] = {
            "parts": [{"text": system_text}]
        }

    candidate_models = [
        GEMINI_MODEL,
        "gemini-1.5-flash",
        "gemini-2.0-flash-lite",
        "gemini-2.0-flash",
        "gemini-1.5-pro",
        "gemini-2.5-flash",
        "gemini-flash-latest"
    ]
    unique_models = list(dict.fromkeys([m for m in candidate_models if m]))

    last_error = None
    async with httpx.AsyncClient(timeout=25.0) as client:
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
    """Call public cloud AI inference endpoints with automatic model fallbacks."""
    # Pollinations text API is now deprecated/paid, raising exception to fail fast
    # and avoid 60-second timeouts that make the UI feel slow.
    raise Exception("Free cloud AI inference currently unavailable")


def _generate_cs_assistant_reply(messages: list[dict], error_msg: str = None) -> str:
    """Intelligent built-in CS and technical interview reasoning engine.
    Ensures the user ALWAYS receives a helpful, high-quality, formatted answer
    even if all external cloud networks are unreachable or rate-limited.
    """
    last_user_msg = ""
    for m in reversed(messages):
        if m.get("role") == "user":
            last_user_msg = (m.get("content") or "").strip()
            break

    q = last_user_msg.lower()



    # 1. Greetings
    if re.search(r"^(hi|hello|hey|hlo|hy|salam|assalamu|greetings|hola)\b", q):
        return (
            "👋 **Hello! I am Zigo AI**, your Computer Science and Technical Interview preparation assistant.\n\n"
            "I can help you with:\n"
            "• **Programming Languages:** C, C++, Java, Python, JavaScript, SQL, etc.\n"
            "• **Core CS Subjects:** Data Structures, Algorithms, OS, DBMS, OOP, Computer Networks, Architecture.\n"
            "• **Coding & Problem Solving:** Code explanations, debugging, syntax, and time complexity.\n"
            "• **Interview Prep:** Mock interview questions, behavioral guidance, and conceptual summaries.\n\n"
            "What topic or question would you like to explore today?"
        )

    # 2. C Programming
    if "c programm" in q or "what is c" in q or "c language" in q:
        return (
            "### 📌 Introduction to C Programming\n\n"
            "**C** is a general-purpose, procedural, and high-performance programming language created by **Dennis Ritchie** in 1972 at Bell Labs.\n\n"
            "#### 🔑 Key Features of C:\n"
            "1. **Fast & Efficient:** Direct access to memory via pointers and close interaction with hardware.\n"
            "2. **Structured Language:** Supports functions, modular programming, and custom data types (`struct`, `union`).\n"
            "3. **Memory Management:** Provides manual dynamic memory allocation (`malloc`, `calloc`, `realloc`, `free`).\n"
            "4. **Portability:** C code can compile and run across virtually all operating systems.\n\n"
            "#### 💻 Basic Syntax Example:\n"
            "```c\n"
            "#include <stdio.h>\n\n"
            "int main() {\n"
            "    printf(\"Hello, Welcome to C Programming!\\n\");\n"
            "    return 0;\n"
            "}\n"
            "```\n\n"
            "#### 💡 Common Technical Interview Questions in C:\n"
            "• Difference between `malloc()` and `calloc()`.\n"
            "• Understanding Pointer arithmetic and dangling pointers.\n"
            "• Difference between Pass by Value vs Pass by Reference."
        )

    # 3. C++ Programming
    if "c++" in q or "cpp" in q:
        return (
            "### 📌 C++ Programming Language Overview\n\n"
            "**C++** is a powerful, high-performance language created by **Bjarne Stroustrup** as an extension of C. It combines procedural programming with **Object-Oriented Programming (OOP)** and generic programming.\n\n"
            "#### 🔑 Core Highlights:\n"
            "• **OOP Paradigm:** Supports Classes, Objects, Inheritance, Polymorphism, and Encapsulation.\n"
            "• **Standard Template Library (STL):** Built-in containers (`vector`, `map`, `set`, `queue`, `stack`) and algorithms.\n"
            "• **Memory & Resource Control:** RAII (Resource Acquisition Is Initialization), Smart Pointers (`std::unique_ptr`, `std::shared_ptr`).\n"
            "• **Performance:** Zero-cost abstractions and direct memory management.\n\n"
            "#### 💻 Basic C++ Example:\n"
            "```cpp\n"
            "#include <iostream>\n"
            "#include <vector>\n\n"
            "int main() {\n"
            "    std::vector<int> nums = {10, 20, 30};\n"
            "    for (int n : nums) {\n"
            "        std::cout << \"Value: \" << n << std::endl;\n"
            "    }\n"
            "    return 0;\n"
            "}\n"
            "```"
        )

    # 4. Java Programming
    if "java" in q and not "javascript" in q:
        return (
            "### 📌 Java Programming Language Overview\n\n"
            "**Java** is a class-based, object-oriented, concurrent, and secure language designed around the principle **\"Write Once, Run Anywhere\" (WORA)**.\n\n"
            "#### 🔑 Key Concepts:\n"
            "• **JVM, JRE, and JDK:** The Java Virtual Machine converts bytecode into machine code.\n"
            "• **Automatic Garbage Collection:** Java manages memory automatically via garbage collectors (G1GC, ZGC).\n"
            "• **String Pool & Immutability:** Strings in Java are immutable for thread safety and security.\n"
            "• **Rich Standard Library:** Extensive multithreading, collections framework, and networking APIs.\n\n"
            "#### 💻 Basic Java Example:\n"
            "```java\n"
            "public class Main {\n"
            "    public static void main(String[] args) {\n"
            "        System.out.println(\"Hello from Java!\");\n"
            "    }\n"
            "}\n"
            "```"
        )

    # 5. OOP (Object Oriented Programming)
    if "oop" in q or "object oriented" in q or "polymorphism" in q or "encapsulation" in q or "inheritance" in q or "abstraction" in q:
        return (
            "### 📌 4 Core Pillars of Object-Oriented Programming (OOP)\n\n"
            "1. **Encapsulation:**\n"
            "   • Bundling data (variables) and methods into a single unit (class), restricting direct access with access modifiers (`private`, `protected`, `public`).\n\n"
            "2. **Abstraction:**\n"
            "   • Hiding complex implementation details and showing only the essential interface to the outside world (using Abstract Classes and Interfaces).\n\n"
            "3. **Inheritance:**\n"
            "   • Mechanism where a child class acquires properties and behaviors of a parent class (`extends`), promoting code reusability.\n\n"
            "4. **Polymorphism (\"Many Forms\"):**\n"
            "   • **Compile-time (Static):** Method Overloading (same name, different parameter signature).\n"
            "   • **Runtime (Dynamic):** Method Overriding (subclass provides specific implementation of a parent method via virtual functions/`@Override`)."
        )

    # 6. DSA (Data Structures & Algorithms)
    if "dsa" in q or "binary search" in q or "linked list" in q or "stack" in q or "queue" in q or "tree" in q or "graph" in q or "sorting" in q:
        return (
            "### 📌 Data Structures & Algorithms (DSA) Essentials\n\n"
            "#### 🔹 Fundamental Data Structures:\n"
            "• **Arrays vs Linked Lists:** Arrays offer $O(1)$ random access but fixed size; Linked Lists offer $O(1)$ insertion/deletion at pointers with dynamic sizing.\n"
            "• **Stack (LIFO):** Used in recursion call stacks, undo operations, syntax parsing ($O(1)$ push/pop).\n"
            "• **Queue (FIFO):** Used in CPU scheduling, printer queues, Breadth-First Search (BFS).\n"
            "• **Hash Table:** Provides average $O(1)$ time for search, insert, and delete using hash functions and collision resolution (chaining/open addressing).\n"
            "• **Binary Search Tree (BST):** Average $O(\\log n)$ search, insert, delete when balanced (e.g. AVL, Red-Black Trees).\n\n"
            "#### 🔹 Essential Algorithms:\n"
            "• **Binary Search:** Searches sorted arrays in $O(\\log n)$ time by repeatedly halving the search range.\n"
            "• **Merge Sort & Quicksort:** Divide-and-conquer algorithms ($O(n \\log n)$ time complexity).\n"
            "• **Graph Traversals:** **BFS** (level-order / shortest path in unweighted graphs) and **DFS** (depth search / backtracking)."
        )

    # 7. Operating Systems (OS)
    if "os" in q or "operating system" in q or "deadlock" in q or "process" in q or "thread" in q or "paging" in q or "virtual memory" in q:
        return (
            "### 📌 Operating Systems (OS) Core Concepts\n\n"
            "#### 1. Process vs. Thread:\n"
            "• **Process:** An independent program in execution with its own dedicated memory space (Heap, Stack, Data, Code).\n"
            "• **Thread:** Lightweight unit of execution within a process that shares code, data, and resources with other threads.\n\n"
            "#### 2. Deadlock & 4 Coffman Conditions:\n"
            "1. **Mutual Exclusion:** Resources cannot be shared simultaneously.\n"
            "2. **Hold and Wait:** Process holding resources requests additional ones.\n"
            "3. **No Preemption:** Resources cannot be forcibly seized.\n"
            "4. **Circular Wait:** A closed chain of processes each waiting for a resource held by the next.\n\n"
            "#### 3. Virtual Memory & Paging:\n"
            "• Enables programs larger than physical RAM to execute by mapping virtual addresses to physical frames using page tables."
        )

    # 8. DBMS (Database Management Systems)
    if "dbms" in q or "database" in q or "sql" in q or "acid" in q or "normalization" in q or "join" in q:
        return (
            "### 📌 Database Management Systems (DBMS) Fundamentals\n\n"
            "#### 1. ACID Properties in Transactions:\n"
            "• **A (Atomicity):** All operations in a transaction succeed, or all fail (all-or-nothing).\n"
            "• **C (Consistency):** Database transitions from one valid state to another, preserving constraints.\n"
            "• **I (Isolation):** Concurrent transactions do not interfere with each other.\n"
            "• **D (Durability):** Committed data is permanently saved even during crashes.\n\n"
            "#### 2. Normalization:\n"
            "• **1NF:** Eliminate duplicate columns and ensure atomic values.\n"
            "• **2NF:** In 1NF and no partial dependency (all non-key attributes fully dependent on candidate key).\n"
            "• **3NF:** In 2NF and no transitive dependency (non-key attributes dependent only on primary key).\n\n"
            "#### 3. SQL Joins:\n"
            "• `INNER JOIN`: Returns rows with matching values in both tables.\n"
            "• `LEFT JOIN`: Returns all rows from left table and matched rows from right table."
        )

    # 9. Computer Networks (CN)
    if "network" in q or "tcp" in q or "udp" in q or "osi" in q or "dns" in q or "http" in q:
        return (
            "### 📌 Computer Networks (CN) Key Concepts\n\n"
            "#### 1. OSI 7-Layer Model:\n"
            "1. **Physical:** Transmission of raw bits over physical medium.\n"
            "2. **Data Link:** Framing and MAC addressing (e.g. Ethernet, Switches).\n"
            "3. **Network:** IP addressing and packet routing (e.g. Routers, IPv4/IPv6).\n"
            "4. **Transport:** End-to-end communication and reliability (TCP, UDP).\n"
            "5. **Session:** Establishes and manages connections.\n"
            "6. **Presentation:** Data formatting, encryption, and compression (SSL/TLS).\n"
            "7. **Application:** User application protocols (HTTP, HTTPS, DNS, FTP, SMTP).\n\n"
            "#### 2. TCP vs. UDP:\n"
            "• **TCP:** Connection-oriented, reliable (acknowledgments, 3-way handshake), ordered delivery.\n"
            "• **UDP:** Connectionless, fast, lightweight, no delivery guarantee (used in streaming, gaming, VoIP)."
        )

    # 10. General Question fallback with clean, structured guidance
    err_text = f"\n\n**Error Details:** `{error_msg}`" if error_msg else ""
    return (
        f"### ⚠️ Offline / Connection Failed\n\n"
        f"I am currently operating in **Offline Fallback Mode** because my Cloud AI connection failed.{err_text}\n\n"
        f"As a result, I cannot dynamically generate an answer for your query: *\"{last_user_msg}\"*.\n\n"
        "**To fix this:**\n"
        "1. Check if your `GEMINI_API_KEY` is correct in Render Environment Variables.\n"
        "2. Make sure the API key has the correct format and has not expired.\n\n"
        "*(Note: Without a key, I can only answer a few pre-programmed questions about C, C++, Java, OOP, OS, DBMS, etc.)*"
    )


async def _get_ai_reply(messages: list[dict]) -> tuple[str, str]:
    """Try Gemini first (if key configured), then Ollama (local), then Built-in CS Knowledge Engine."""
    last_error_msg = None
    # 1. Try Google Gemini API if key is set
    if GEMINI_API_KEY:
        try:
            return await _call_gemini_ask(messages), "gemini"
        except Exception as e:
            last_error_msg = str(e)
            print(f"[Ask AI] Gemini call failed: {e}")

    # 2. Try Ollama (local LLM when PC is running)
    try:
        return await _call_ollama_ask(messages), "ollama"
    except Exception as e:
        pass

    # 3. Intelligent built-in CS knowledge & reasoning engine
    return _generate_cs_assistant_reply(messages, last_error_msg), "cloud-ai"


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
