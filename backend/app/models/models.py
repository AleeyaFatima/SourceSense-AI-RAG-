from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Relationship, Column, JSON

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    name: str
    hashed_password: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    documents: List["Document"] = Relationship(back_populates="user")
    conversations: List["Conversation"] = Relationship(back_populates="user")

class Document(SQLModel, table=True):
    __tablename__ = "documents"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str
    file_type: str  # pdf, docx, txt, md
    file_path: str
    page_count: int = Field(default=0)
    chunk_count: int = Field(default=0)
    status: str = Field(default="processing")  # processing, ready, failed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="documents")
    chunks: List["Chunk"] = Relationship(back_populates="document", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Chunk(SQLModel, table=True):
    __tablename__ = "chunks"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    document_id: int = Field(foreign_key="documents.id", index=True)
    content: str
    chunk_index: int
    page_number: Optional[int] = Field(default=1)
    section_heading: Optional[str] = Field(default=None)
    token_count: int = Field(default=0)
    embedding_id: str  # UUID or String ID referencing the point in Qdrant
    
    # Coordinates for 2D visualization (pre-projected using PCA/t-SNE)
    x_coord: Optional[float] = Field(default=0.0)
    y_coord: Optional[float] = Field(default=0.0)
    
    # Relationships
    document: Document = Relationship(back_populates="chunks")

class Conversation(SQLModel, table=True):
    __tablename__ = "conversations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id", index=True)
    title: str = Field(default="New Conversation")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    user: User = Relationship(back_populates="conversations")
    messages: List["Message"] = Relationship(back_populates="conversation", sa_relationship_kwargs={"cascade": "all, delete-orphan"})

class Message(SQLModel, table=True):
    __tablename__ = "messages"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    conversation_id: int = Field(foreign_key="conversations.id", index=True)
    role: str  # user, assistant
    content: str
    
    # Store citations in database-agnostic JSON column
    citations: Optional[List[Dict[str, Any]]] = Field(default=None, sa_column=Column(JSON))
    
    confidence_score: Optional[float] = Field(default=0.0)
    
    # Detailed retrieval tracing metadata (stages, scores, chunk texts)
    retrieval_metadata: Optional[Dict[str, Any]] = Field(default=None, sa_column=Column(JSON))
    
    latency_ms: Optional[int] = Field(default=0)
    model_used: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    conversation: Conversation = Relationship(back_populates="messages")
    evaluation: Optional["Evaluation"] = Relationship(back_populates="message", sa_relationship_kwargs={"uselist": False, "cascade": "all, delete-orphan"})

class Evaluation(SQLModel, table=True):
    __tablename__ = "evaluations"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    message_id: int = Field(foreign_key="messages.id", unique=True, index=True)
    retrieval_precision: Optional[float] = Field(default=None)
    faithfulness: Optional[float] = Field(default=None)
    answer_relevance: Optional[float] = Field(default=None)
    citation_accuracy: Optional[float] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    message: Message = Relationship(back_populates="evaluation")
