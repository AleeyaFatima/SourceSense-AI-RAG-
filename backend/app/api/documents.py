import os
import shutil
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks, status
from sqlmodel import Session, select
from datetime import datetime

from app.core.db import get_session
from app.core.security import get_current_user
from app.models.models import Document, Chunk, User
from app.services.ingestion import process_and_index_document, get_qdrant_client

router = APIRouter(prefix="/documents", tags=["documents"])

UPLOAD_DIR = "./data/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/upload", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # 1. Validate file extension
    filename = file.filename
    file_ext = filename.split(".")[-1].lower() if "." in filename else ""
    if file_ext not in ["pdf", "docx", "txt", "md"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type: {file_ext}. Only PDF, DOCX, TXT, and MD are supported."
        )
        
    # 2. Save file to disk
    file_uuid = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    safe_filename = f"{file_uuid}_{filename}"
    file_path = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not save file: {str(e)}"
        )
        
    # 3. Create document record in database
    title = filename.rsplit(".", 1)[0]
    db_document = Document(
        user_id=current_user.id,
        title=title,
        file_type=file_ext,
        file_path=file_path,
        status="processing",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)
    
    # 4. Trigger background task to process and index the document
    background_tasks.add_task(process_and_index_document, db, db_document.id)
    
    return {
        "message": "Document uploaded successfully and ingestion has started.",
        "document": {
            "id": db_document.id,
            "title": db_document.title,
            "file_type": db_document.file_type,
            "status": db_document.status,
            "created_at": db_document.created_at
        }
    }

@router.get("/", response_model=List[Document])
def list_documents(
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    # Retrieve documents uploaded by the current user
    statement = select(Document).where(Document.user_id == current_user.id).order_by(Document.created_at.desc())
    return db.exec(statement).all()

@router.get("/{doc_id}", response_model=Document)
def get_document_details(
    doc_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    document = db.get(Document, doc_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
    return document

@router.delete("/{doc_id}", response_model=Dict[str, Any])
def delete_document(
    doc_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    document = db.get(Document, doc_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Delete from Qdrant Vector DB
    try:
        from qdrant_client.models import Filter, FieldCondition, MatchValue
        qdrant_client = get_qdrant_client()
        collection_name = "sourcesense_chunks"
        
        # Check if collection exists
        collections = qdrant_client.get_collections().collections
        if any(c.name == collection_name for c in collections):
            qdrant_client.delete(
                collection_name=collection_name,
                points_selector=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=doc_id)
                        )
                    ]
                )
            )
    except Exception as e:
        print(f"Error deleting vectors from Qdrant: {e}")
        # Continue deleting DB records even if Qdrant call fails
        
    # Delete upload file on disk
    if os.path.exists(document.file_path):
        try:
            os.remove(document.file_path)
        except Exception as e:
            print(f"Failed to remove file from disk: {e}")
            
    # Delete from PostgreSQL/SQLite DB (will cascade delete chunks)
    db.delete(document)
    db.commit()
    
    return {"message": "Document deleted successfully", "document_id": doc_id}

@router.get("/{doc_id}/chunks", response_model=List[Dict[str, Any]])
def get_document_chunks(
    doc_id: int,
    db: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):
    document = db.get(Document, doc_id)
    if not document or document.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
        
    statement = select(Chunk).where(Chunk.document_id == doc_id).order_by(Chunk.chunk_index.asc())
    chunks = db.exec(statement).all()
    
    return [
        {
            "id": c.id,
            "chunk_index": c.chunk_index,
            "content": c.content,
            "page_number": c.page_number,
            "section_heading": c.section_heading,
            "token_count": c.token_count,
            "x_coord": c.x_coord,
            "y_coord": c.y_coord
        }
        for c in chunks
    ]
