 
from sqlalchemy import Column, Integer, String, Text, Enum, TIMESTAMP, ForeignKey, func
from sqlalchemy.orm import relationship

from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    plan = Column(Enum("free", "pro", name="plan_enum"), nullable=False, default="free")
    created_at = Column(TIMESTAMP, server_default=func.now())

    sessions = relationship("InterviewSession", back_populates="user", cascade="all, delete-orphan")


class Question(Base):
    __tablename__ = "questions"

    id = Column(Integer, primary_key=True, index=True)
    topic = Column(String(50), nullable=False, index=True)
    question_text = Column(Text, nullable=False)


class InterviewSession(Base):
    """Represents one interview session/attempt for a topic."""

    __tablename__ = "sessions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    topic = Column(String(50), nullable=False)
    started_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User", back_populates="sessions")
    messages = relationship("Message", back_populates="session", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    role = Column(Enum("user", "bot", name="role_enum"), nullable=False)
    content = Column(Text, nullable=False)
    score = Column(Integer, nullable=True)
    created_at = Column(TIMESTAMP, server_default=func.now())

    session = relationship("InterviewSession", back_populates="messages")


class AskAIConversation(Base):
    """A free-form Ask AI conversation belonging to a user."""

    __tablename__ = "ask_ai_conversations"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title = Column(String(255), nullable=False, default="New Chat")
    created_at = Column(TIMESTAMP, server_default=func.now())

    user = relationship("User")
    messages = relationship("AskAIMessage", back_populates="conversation", cascade="all, delete-orphan")


class AskAIMessage(Base):
    """A single message inside an Ask AI conversation."""

    __tablename__ = "ask_ai_messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ask_ai_conversations.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    conversation = relationship("AskAIConversation", back_populates="messages")
