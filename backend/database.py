 

import os
import sys
from dotenv import load_dotenv
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT", "3306")
DB_NAME = os.getenv("DB_NAME", "interview_prep_chatbot")

SQLITE_URL = "sqlite:///./interview_prep.db"
engine = None

# 1. Try DATABASE_URL if explicitly provided in environment
if DATABASE_URL:
    db_uri = DATABASE_URL
    if db_uri.startswith("postgres://"):
        db_uri = db_uri.replace("postgres://", "postgresql://", 1)
    try:
        custom_engine = create_engine(db_uri, pool_pre_ping=True)
        with custom_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = custom_engine
        print("[Database] Successfully connected via DATABASE_URL.")
    except Exception:
        engine = None

# 2. Try remote MySQL if DB_HOST is explicitly configured and not localhost
if engine is None and DB_HOST and DB_HOST != "localhost":
    user = DB_USER or "root"
    pwd = DB_PASSWORD or ""
    mysql_url = f"mysql+pymysql://{user}:{pwd}@{DB_HOST}:{DB_PORT}/{DB_NAME}"
    try:
        mysql_engine = create_engine(
            mysql_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 3}
        )
        with mysql_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = mysql_engine
        print(f"[Database] Successfully connected to MySQL at {DB_HOST}.")
    except Exception:
        engine = None

# 3. Try local MySQL if running locally and explicitly configured
if engine is None and not os.getenv("RENDER") and (DB_HOST == "localhost" or not DB_HOST) and DB_PASSWORD:
    user = DB_USER or "root"
    mysql_url = f"mysql+pymysql://{user}:{DB_PASSWORD}@localhost:{DB_PORT}/{DB_NAME}"
    try:
        mysql_engine = create_engine(
            mysql_url,
            pool_pre_ping=True,
            connect_args={"connect_timeout": 1}
        )
        with mysql_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        engine = mysql_engine
        print("[Database] Successfully connected to local MySQL server.")
    except Exception:
        engine = None

# 4. Clean fallback to SQLite for Cloud (Render) & Local fallback
if engine is None:
    engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False}
    )
    print("[Database] Initialized database using SQLite (interview_prep.db).")

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that provides a DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

