import json
import time
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Query
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
from datetime import datetime

from app.core.db import get_session
from app.core.security import get_current_user
from app.models.models import Conversation, Message, User, Evaluation
from app.services.retrieval import hybrid_retrieve
from app.services.llm import stream_rag_answer
from app.services.evaluation import run_evaluation

router = APIRouter(prefix="/chat", tags=["chat"])

@router.get("/conversations", response_model=List[Conversation])
def list_conversations(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    statement = select(Conversation).where(Conversation.user_id == current_user.id).order_by(Conversation.created_at.desc())
    return db.exec(statement).all()

@router.post("/conversations", response_model=Conversation, status_code=status.HTTP_201_CREATED)
def create_conversation(
    conv_data: Dict[str, str],
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    title = conv_data.get("title", "New Conversation")
    conversation = Conversation(
        user_id=current_user.id,
        title=title,
        created_at=datetime.utcnow()
    )
    db.add(conversation)
    db.commit()
    db.refresh(conversation)
    return conversation

@router.get("/conversations/{conv_id}/messages", response_model=List[Dict[str, Any]])
def get_conversation_messages(
    conv_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    conversation = db.get(Conversation, conv_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    statement = select(Message).where(Message.conversation_id == conv_id).order_by(Message.created_at.asc())
    messages = db.exec(statement).all()
    
    # Format messages nicely, including any evaluation if present
    formatted = []
    for m in messages:
        # Check if evaluation exists
        eval_data = None
        if m.evaluation:
            eval_data = {
                "retrieval_precision": m.evaluation.retrieval_precision,
                "faithfulness": m.evaluation.faithfulness,
                "answer_relevance": m.evaluation.answer_relevance,
                "citation_accuracy": m.evaluation.citation_accuracy
            }
            
        formatted.append({
            "id": m.id,
            "role": m.role,
            "content": m.content,
            "citations": m.citations,
            "confidence_score": m.confidence_score,
            "retrieval_metadata": m.retrieval_metadata,
            "latency_ms": m.latency_ms,
            "model_used": m.model_used,
            "created_at": m.created_at,
            "evaluation": eval_data
        })
    return formatted

@router.delete("/conversations/{conv_id}", response_model=Dict[str, Any])
def delete_conversation(
    conv_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    conversation = db.get(Conversation, conv_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    db.delete(conversation)
    db.commit()
    return {"message": "Conversation deleted successfully", "conversation_id": conv_id}

@router.get("/query")
def query_rag(
    background_tasks: BackgroundTasks,
    conversation_id: int = Query(..., description="Active Conversation ID"),
    query: str = Query(..., description="Search query string"),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    """
    SSE stream endpoint for RAG QA.
    1. Runs hybrid retrieval to gather chunks.
    2. Streams response text from LLM/Simulation.
    3. Triggers verification and records results.
    4. Queues background job for evaluation score calculation.
    """
    conversation = db.get(Conversation, conversation_id)
    if not conversation or conversation.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Conversation not found")
        
    # If this is the first query in a conversation, rename conversation dynamically
    if len(conversation.messages) == 0:
        conversation.title = query[:40] + ("..." if len(query) > 40 else "")
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 1. Retrieve relevant chunks
    retrieval_start = time.time()
    retrieval_output = hybrid_retrieve(db, query)
    chunks = retrieval_output["results"]
    trace = retrieval_output["trace"]
    
    # Save the user query message first
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=query,
        created_at=datetime.utcnow()
    )
    db.add(user_message)
    db.commit()
    db.refresh(user_message)

    # 2. Generator for streaming RAG responses
    def sse_generator():
        # First send the initial retrieval metadata so the frontend can display retrieval details
        yield "data: " + json.dumps({
            "retrieval_metadata": {
                "trace": trace,
                "chunks": [
                    {
                        "embedding_id": c["embedding_id"],
                        "document_id": c["document_id"],
                        "document_title": c["document_title"],
                        "page_number": c["page_number"],
                        "section_heading": c["section_heading"],
                        "score": c.get("rerank_score", c.get("rrf_score", 0.0)),
                        "content": c["content"]
                    }
                    for c in chunks
                ]
            }
        }) + "\n\n"
        
        full_assistant_response = ""
        citations = []
        confidence_score = 0.0
        latency_ms = 0
        
        # Stream the LLM response
        for sse_line in stream_rag_answer(query, chunks):
            # Parse the payload from the line
            if sse_line.startswith("data: "):
                payload = json.loads(sse_line[6:].strip())
                
                # Check if text chunk
                if "text" in payload:
                    full_assistant_response += payload["text"]
                    yield sse_line
                
                # Check if final summary payload
                if payload.get("done") is True:
                    citations = payload.get("citations", [])
                    confidence_score = payload.get("confidence_score", 0.0)
                    latency_ms = payload.get("latency_ms", 0)
                    yield sse_line
                    
        # Save the assistant's complete response to database
        model_name = "GPT-4o-mini" if settings.OPENAI_API_KEY else "SourceSense-LLM"
        assistant_message = Message(
            conversation_id=conversation_id,
            role="assistant",
            content=full_assistant_response,
            citations=citations,
            confidence_score=confidence_score,
            retrieval_metadata={
                "trace": trace,
                "chunks": [
                    {
                        "embedding_id": c["embedding_id"],
                        "document_id": c["document_id"],
                        "document_title": c["document_title"],
                        "page_number": c["page_number"],
                        "section_heading": c["section_heading"]
                    } for c in chunks
                ]
            },
            latency_ms=latency_ms,
            model_used=model_name,
            created_at=datetime.utcnow()
        )
        db.add(assistant_message)
        db.commit()
        db.refresh(assistant_message)
        
        # 3. Queue evaluation metrics calculation in background
        background_tasks.add_task(run_evaluation, db, assistant_message, chunks)
        
    return StreamingResponse(sse_generator(), media_type="text/event-stream")
