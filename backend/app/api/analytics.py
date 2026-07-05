from typing import Dict, Any, List
from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from datetime import datetime, timedelta
from collections import defaultdict

from app.core.db import get_session
from app.core.security import get_current_user
from app.models.models import Document, Message, User, Evaluation

router = APIRouter(prefix="/analytics", tags=["analytics"])

@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard_summary(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Total documents
    doc_stmt = select(Document).where(Document.user_id == current_user.id)
    docs = db.exec(doc_stmt).all()
    total_docs = len(docs)
    ready_docs = sum(1 for d in docs if d.status == "ready")
    
    # 2. Total questions
    # Get all conversations for user, then all messages
    msg_stmt = select(Message).join(Message.conversation).where(Message.conversation.has(user_id=current_user.id))
    all_messages = db.exec(msg_stmt).all()
    
    assistant_messages = [m for m in all_messages if m.role == "assistant"]
    user_messages = [m for m in all_messages if m.role == "user"]
    total_questions = len(user_messages)
    
    # 3. Average confidence and average latency
    avg_confidence = 0.0
    avg_latency = 0.0
    
    if assistant_messages:
        valid_confidences = [m.confidence_score for m in assistant_messages if m.confidence_score is not None]
        valid_latencies = [m.latency_ms for m in assistant_messages if m.latency_ms is not None]
        
        if valid_confidences:
            avg_confidence = sum(valid_confidences) / len(valid_confidences)
        if valid_latencies:
            avg_latency = sum(valid_latencies) / len(valid_latencies)
            
    # 4. Recent queries (last 5 queries)
    recent_queries = []
    # Sort user messages by date desc, then take top 5
    user_messages_sorted = sorted(user_messages, key=lambda x: x.created_at, reverse=True)[:5]
    
    for um in user_messages_sorted:
        # Find corresponding assistant message in the same conversation
        # (usually the next message chronologically)
        corr_am = next((am for am in assistant_messages 
                       if am.conversation_id == um.conversation_id and am.created_at > um.created_at), None)
        
        recent_queries.append({
            "conversation_id": um.conversation_id,
            "question": um.content[:80] + ("..." if len(um.content) > 80 else ""),
            "timestamp": um.created_at,
            "confidence_score": corr_am.confidence_score if corr_am else None,
            "latency_ms": corr_am.latency_ms if corr_am else None
        })
        
    # 5. Status indicators
    system_status = {
        "api": "healthy",
        "vector_db": "healthy",  # Since we are using local Qdrant, if it initialized it's healthy
        "embedding_model": "active" if ready_docs > 0 or len(docs) > 0 else "standby"
    }
    
    return {
        "metrics": {
            "total_documents": total_docs,
            "ready_documents": ready_docs,
            "total_questions": total_questions,
            "avg_confidence": round(avg_confidence, 2),
            "avg_latency_ms": int(avg_latency),
        },
        "system_status": system_status,
        "recent_queries": recent_queries
    }

@router.get("/charts", response_model=Dict[str, Any])
def get_charts_data(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    Returns aggregated data formatted specifically for Recharts visualizations.
    """
    # Get all user conversations and messages
    msg_stmt = select(Message).join(Message.conversation).where(Message.conversation.has(user_id=current_user.id))
    all_messages = db.exec(msg_stmt).all()
    
    assistant_messages = [m for m in all_messages if m.role == "assistant"]
    assistant_messages_sorted = sorted(assistant_messages, key=lambda x: x.created_at)
    
    # 1. Confidence score distribution over time (last 10 queries)
    confidence_over_time = []
    for rank, m in enumerate(assistant_messages_sorted[-10:]):
        # find matching user question
        user_msg = db.exec(select(Message).where(Message.conversation_id == m.conversation_id, Message.role == "user", Message.created_at < m.created_at).order_by(Message.created_at.desc())).first()
        query_label = user_msg.content[:15] + "..." if user_msg else f"Q{rank+1}"
        confidence_over_time.append({
            "name": query_label,
            "Confidence": round(m.confidence_score * 100, 1) if m.confidence_score else 0.0,
            "Latency": m.latency_ms or 0
        })
        
    # 2. Questions per day (last 7 days)
    queries_per_day = []
    today = datetime.utcnow().date()
    daily_counts = defaultdict(int)
    
    for m in all_messages:
        if m.role == "user":
            day_str = m.created_at.date().strftime("%b %d")
            daily_counts[day_str] += 1
            
    # Populate last 7 calendar days
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        day_str = day.strftime("%b %d")
        queries_per_day.append({
            "date": day_str,
            "Queries": daily_counts[day_str]
        })
        
    # 3. Latency distribution (Histogram style)
    latency_buckets = {
        "0-200ms": 0,
        "200-500ms": 0,
        "500-1000ms": 0,
        "1s-2s": 0,
        "2s+": 0
    }
    for m in assistant_messages:
        lat = m.latency_ms or 0
        if lat <= 200:
            latency_buckets["0-200ms"] += 1
        elif lat <= 500:
            latency_buckets["200-500ms"] += 1
        elif lat <= 1000:
            latency_buckets["500-1000ms"] += 1
        elif lat <= 2000:
            latency_buckets["1s-2s"] += 1
        else:
            latency_buckets["2s+"] += 1
            
    latency_distribution = [
        {"range": k, "Count": v} for k, v in latency_buckets.items()
    ]
    
    # 4. Most queried documents
    # Aggregate from retrieval metadata
    doc_query_counts = defaultdict(int)
    for m in assistant_messages:
        meta = m.retrieval_metadata or {}
        chunks_retrieved = meta.get("chunks", [])
        seen_docs_in_query = set()
        for c in chunks_retrieved:
            doc_id = c.get("document_id")
            if doc_id:
                seen_docs_in_query.add(doc_id)
        for doc_id in seen_docs_in_query:
            doc_query_counts[doc_id] += 1
            
    # Resolve document names
    most_queried_docs = []
    if doc_query_counts:
        docs = db.exec(select(Document).where(Document.id.in_(list(doc_query_counts.keys())))).all()
        doc_names = {d.id: d.title for d in docs}
        
        sorted_docs = sorted(doc_query_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        for doc_id, count in sorted_docs:
            most_queried_docs.append({
                "document": doc_names.get(doc_id, f"Doc ID {doc_id}")[:20],
                "Queries": count
            })
    else:
        # Default empty states helper data
        most_queried_docs = [{"document": "No documents", "Queries": 0}]
        
    # 5. RAGAS Evaluation Scores
    eval_stmt = select(Evaluation).join(Evaluation.message).join(Message.conversation).where(Message.conversation.has(user_id=current_user.id))
    evals = db.exec(eval_stmt).all()
    
    avg_precision = 0.0
    avg_faithfulness = 0.0
    avg_relevance = 0.0
    avg_citation = 0.0
    
    if evals:
        avg_precision = sum(e.retrieval_precision for e in evals) / len(evals)
        avg_faithfulness = sum(e.faithfulness for e in evals) / len(evals)
        avg_relevance = sum(e.answer_relevance for e in evals) / len(evals)
        avg_citation = sum(e.citation_accuracy for e in evals) / len(evals)
        
    evaluation_scores = {
        "retrieval_precision": round(avg_precision, 2),
        "faithfulness": round(avg_faithfulness, 2),
        "answer_relevance": round(avg_relevance, 2),
        "citation_accuracy": round(avg_citation, 2),
        "count": len(evals)
    }
    
    return {
        "confidence_over_time": confidence_over_time,
        "queries_per_day": queries_per_day,
        "latency_distribution": latency_distribution,
        "most_queried_docs": most_queried_docs,
        "evaluation_scores": evaluation_scores
    }
