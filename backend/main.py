 
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine, SessionLocal
import models  # noqa: F401 - ensures models are registered before create_all
from models import Question
from routes import auth, chat, history

# Create tables if they don't already exist (database.sql also does this).
Base.metadata.create_all(bind=engine)

def seed_default_questions():
    db = SessionLocal()
    try:
        if db.query(Question).count() == 0:
            print("[Database] Seeding default interview questions...")
            default_questions = [
                # DSA
                ("DSA", "What is the difference between an array and a linked list?"),
                ("DSA", "Explain how a hash table works and how collisions are handled."),
                ("DSA", "What is the time complexity of binary search, and why does it work only on sorted data?"),
                ("DSA", "Describe how a binary search tree differs from a balanced binary search tree (e.g. AVL tree)."),
                ("DSA", "What is the difference between BFS and DFS traversal on a graph?"),
                ("DSA", "Explain how a min-heap is used to implement a priority queue."),
                ("DSA", "What is dynamic programming, and how does it differ from plain recursion?"),
                ("DSA", "What is the time and space complexity of merge sort, and how does it compare to quicksort?"),
                # OS
                ("OS", "What is the difference between a process and a thread?"),
                ("OS", "Explain the concept of a deadlock and the four necessary conditions for it to occur."),
                ("OS", "What is virtual memory and why is it used?"),
                ("OS", "Describe the difference between paging and segmentation."),
                ("OS", "What is a race condition, and how can it be prevented?"),
                ("OS", "Explain the difference between preemptive and non-preemptive scheduling."),
                ("OS", "What is a semaphore and how does it differ from a mutex?"),
                ("OS", "What happens during a context switch?"),
                # DBMS
                ("DBMS", "What is normalization and why is it important?"),
                ("DBMS", "Explain the difference between primary key, foreign key, and unique key."),
                ("DBMS", "What are ACID properties in a database transaction?"),
                ("DBMS", "What is the difference between a clustered and a non-clustered index?"),
                ("DBMS", "Explain the difference between INNER JOIN and LEFT JOIN."),
                ("DBMS", "What is a deadlock in DBMS and how is it different from an OS deadlock?"),
                ("DBMS", "What is the purpose of database indexing, and what are its trade-offs?"),
                ("DBMS", "Explain the difference between SQL and NoSQL databases."),
                # OOP
                ("OOP", "What are the four main principles of object-oriented programming?"),
                ("OOP", "Explain the difference between method overloading and method overriding."),
                ("OOP", "What is the difference between an abstract class and an interface?"),
                ("OOP", "What is polymorphism, and can you give a real-world example?"),
                ("OOP", "Explain the concept of encapsulation and why it is useful."),
                ("OOP", "What is the difference between composition and inheritance?"),
                ("OOP", "What is a constructor, and how does it differ from a destructor?"),
                ("OOP", "Explain what a virtual function is and why it is used."),
                # CN
                ("CN", "What is the difference between TCP and UDP?"),
                ("CN", "Explain the OSI model and its seven layers."),
                ("CN", "What happens when you type a URL into a browser and press enter?"),
                ("CN", "What is the difference between a hub, a switch, and a router?"),
                ("CN", "Explain how DNS resolution works."),
                ("CN", "What is the difference between HTTP and HTTPS?"),
                ("CN", "What is the three-way handshake in TCP?"),
                ("CN", "What is NAT (Network Address Translation) and why is it used?"),
            ]
            for topic, q_text in default_questions:
                db.add(Question(topic=topic, question_text=q_text))
            db.commit()
            print("[Database] Default questions seeded successfully.")
    except Exception as err:
        print(f"[Database] Could not seed questions: {err}")
    finally:
        db.close()

seed_default_questions()

app = FastAPI(title="AI Interview Prep Chatbot API")

allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "*")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")] if allowed_origins_env != "*" else ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_origin_regex=r"http://.*" if "*" in allowed_origins else None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(history.router)


@app.get("/")
def root():
    return {"status": "ok", "message": "AI Interview Prep Chatbot API is running"}

    