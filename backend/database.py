 

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DB_USER = os.getenv("DB_USER", "root")
DB_PASSWORD = os.getenv("DB_PASSWORD", "Rakib125043")
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "interview_prep_chatbot")

MYSQL_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
SQLITE_URL = "sqlite:///./app.db"

engine = None
try:
    # Try MySQL first with 2-second timeout
    mysql_engine = create_engine(
        MYSQL_URL,
        pool_pre_ping=True,
        connect_args={"connect_timeout": 2}
    )
    with mysql_engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    engine = mysql_engine
    print("[Database] Successfully connected to MySQL server.")
except Exception as e:
    print(f"[Database] MySQL not available ({e}). Falling back to local SQLite database.")
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

