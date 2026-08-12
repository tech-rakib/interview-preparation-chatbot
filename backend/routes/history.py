 

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import User, InterviewSession, Message
from routes.auth import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


class SessionSummary(BaseModel):
    session_id: int
    topic: str
    started_at: str
    average_score: float | None
    question_count: int


class MessageOut(BaseModel):
    role: str
    content: str
    score: int | None
    created_at: str


class SessionDetail(BaseModel):
    session_id: int
    topic: str
    started_at: str
    messages: list[MessageOut]


@router.get("/sessions", response_model=list[SessionSummary])
def list_sessions(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    sessions = (
        db.query(InterviewSession)
        .filter(InterviewSession.user_id == current_user.id)
        .order_by(InterviewSession.started_at.desc())
        .all()
    )

    summaries = []
    for session in sessions:
        scored = [m.score for m in session.messages if m.role == "bot" and m.score is not None]
        avg_score = round(sum(scored) / len(scored), 1) if scored else None
        summaries.append(
            SessionSummary(
                session_id=session.id,
                topic=session.topic,
                started_at=session.started_at.isoformat(),
                average_score=avg_score,
                question_count=len(scored),
            )
        )
    return summaries


@router.get("/sessions/{session_id}", response_model=SessionDetail)
def get_session_detail(
    session_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    session = (
        db.query(InterviewSession)
        .filter(InterviewSession.id == session_id, InterviewSession.user_id == current_user.id)
        .first()
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = (
        db.query(Message)
        .filter(Message.session_id == session.id)
        .order_by(Message.id.asc())
        .all()
    )

    return SessionDetail(
        session_id=session.id,
        topic=session.topic,
        started_at=session.started_at.isoformat(),
        messages=[
            MessageOut(
                role=m.role,
                content=m.content,
                score=m.score,
                created_at=m.created_at.isoformat(),
            )
            for m in messages
        ],
    )
