import os
import uuid
import re
from typing import List, Dict, Any, Tuple
from datetime import datetime
from sqlmodel import Session, select
import numpy as np

# Try importing libraries and define fallbacks if they aren't loaded yet
try:
    import fitz  # PyMuPDF
except ImportError:
    fitz = None

try:
    import docx
except ImportError:
    docx = None

SentenceTransformer = None

PCA = None

from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

from app.core.config import settings
from app.models.models import Document, Chunk

# Global in-memory embedding model cache
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    # Disable heavy local ML model on memory-constrained Render free tier
    if os.environ.get("ENV") == "production":
        return None
    if settings.EMBEDDING_PROVIDER == "openai":
        return None
    
    try:
        from sentence_transformers import SentenceTransformer
    except ImportError:
        return None

    if _embedding_model is None:
        try:
            _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
        except Exception as e:
            print(f"Error loading local SentenceTransformer model: {e}")
            _embedding_model = None
    return _embedding_model

def get_qdrant_client() -> QdrantClient:
    """
    Get Qdrant Client based on configuration.
    If QDRANT_URL is set, connect to the cloud/remote instance.
    Otherwise, run in local file-based mode.
    """
    if settings.QDRANT_URL:
        return QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY
        )
    else:
        # Local in-memory or file mode
        os.makedirs(settings.QDRANT_PATH, exist_ok=True)
        return QdrantClient(path=settings.QDRANT_PATH)

def init_qdrant_collection(client: QdrantClient, collection_name: str, vector_size: int):
    """Ensure the vector collection exists in Qdrant."""
    try:
        collections = client.get_collections().collections
        exists = any(c.name == collection_name for c in collections)
        if not exists:
            client.create_collection(
                collection_name=collection_name,
                vectors_config=VectorParams(size=vector_size, distance=Distance.COSINE)
            )
            print(f"Created Qdrant collection: {collection_name}")
    except Exception as e:
        print(f"Failed to check/create Qdrant collection {collection_name}: {e}")

def get_embeddings(texts: List[str]) -> List[List[float]]:
    """Generate vector embeddings for a list of texts."""
    # Try OpenAI
    if settings.EMBEDDING_PROVIDER == "openai" and settings.OPENAI_API_KEY:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            response = client.embeddings.create(
                input=texts,
                model="text-embedding-3-small"
            )
            return [data.embedding for data in response.data]
        except Exception as e:
            print(f"OpenAI embedding failed, falling back to local: {e}")
            
    # Try Local SentenceTransformer
    model = get_embedding_model()
    if model is not None:
        try:
            embeddings = model.encode(texts)
            return [emb.tolist() for emb in embeddings]
        except Exception as e:
            print(f"Local sentence-transformers embedding failed: {e}")
            
    # Fallback/Mock embeddings: generate deterministic unit vectors based on text hash
    print("WARNING: Generating mock/fallback embeddings")
    vector_size = 1536 if settings.EMBEDDING_PROVIDER == "openai" else 384
    embeddings = []
    for text in texts:
        # Create a deterministic mock vector
        seed = sum(ord(c) for c in text[:100]) % 1000
        rng = np.random.default_rng(seed)
        v = rng.standard_normal(vector_size)
        v = v / np.linalg.norm(v)  # normalize
        embeddings.append(v.tolist())
    return embeddings

def extract_text_from_file(file_path: str, file_type: str) -> Tuple[str, List[Dict[str, Any]]]:
    """
    Extracts text from files and returns (full_text, pages_metadata).
    pages_metadata is a list of dicts: {'page_number': int, 'content': str}
    """
    full_text = ""
    pages_metadata = []
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")
        
    if file_type == "pdf":
        if fitz is None:
            # Simple fallback if fitz not installed yet
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            return content, [{"page_number": 1, "content": content}]
            
        try:
            doc = fitz.open(file_path)
            for page_idx, page in enumerate(doc):
                page_text = page.get_text()
                pages_metadata.append({
                    "page_number": page_idx + 1,
                    "content": page_text
                })
                full_text += page_text + "\n"
            doc.close()
        except Exception as e:
            print(f"PyMuPDF failed to extract text: {e}")
            raise e
            
    elif file_type == "docx":
        if docx is None:
            # Fallback
            return "docx content (missing python-docx)", []
        try:
            doc = docx.Document(file_path)
            # docx doesn't have page concepts out of the box, so we divide by paragraphs
            paras = [p.text for p in doc.paragraphs if p.text.strip()]
            full_text = "\n".join(paras)
            # Fake pages: every 5 paragraphs is a 'page'
            chunk_size_paras = 5
            for i in range(0, len(paras), chunk_size_paras):
                page_content = "\n".join(paras[i:i+chunk_size_paras])
                pages_metadata.append({
                    "page_number": (i // chunk_size_paras) + 1,
                    "content": page_content
                })
        except Exception as e:
            print(f"python-docx failed to extract text: {e}")
            raise e
            
    else:  # txt or md
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                full_text = f.read()
            # Fake pages: split text every 2000 characters
            chunk_char_size = 2000
            for i in range(0, len(full_text), chunk_char_size):
                page_content = full_text[i:i+chunk_char_size]
                pages_metadata.append({
                    "page_number": (i // chunk_char_size) + 1,
                    "content": page_content
                })
        except Exception as e:
            print(f"Failed to read text file: {e}")
            raise e
            
    return full_text, pages_metadata

def chunk_text(pages_metadata: List[Dict[str, Any]], chunk_size: int = 1500, overlap: int = 200) -> List[Dict[str, Any]]:
    """
    Split text into chunks. Keeps track of page numbers and section headings.
    chunk_size is character length roughly equivalent to 350-500 words.
    """
    chunks = []
    chunk_index = 0
    
    for page in pages_metadata:
        page_num = page["page_number"]
        text = page["content"]
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text).strip()
        if not text:
            continue
            
        # Try to parse section headings (e.g. "1. Introduction" or "## Section Title")
        headings = re.findall(r'(?:^|\. )((?:[A-Z][A-Za-z0-9\s]{3,30}:?)|(?:(?:[0-9]\.)+[A-Z][A-Za-z\s]+))', text)
        current_heading = headings[0] if headings else None
        
        # Chunking page text
        start = 0
        while start < len(text):
            end = start + chunk_size
            if end > len(text):
                end = len(text)
            else:
                # Try to end on a space/period
                boundary = text.rfind('. ', start, end)
                if boundary != -1 and boundary > start + chunk_size * 0.6:
                    end = boundary + 1
                else:
                    boundary_space = text.rfind(' ', start, end)
                    if boundary_space != -1 and boundary_space > start + chunk_size * 0.7:
                        end = boundary_space
            
            chunk_content = text[start:end].strip()
            
            # Simple token approximation (4 characters per token)
            token_count = len(chunk_content) // 4
            
            if chunk_content:
                chunks.append({
                    "content": chunk_content,
                    "chunk_index": chunk_index,
                    "page_number": page_num,
                    "section_heading": current_heading,
                    "token_count": token_count
                })
                chunk_index += 1
                
            start += chunk_size - overlap
            
    return chunks

def project_embeddings_2d(embeddings: List[List[float]]) -> List[Tuple[float, float]]:
    """
    Reduce embeddings dimensionality to 2D for the scatter plot.
    Uses PCA if scikit-learn is available, otherwise uses deterministic random projection.
    """
    num_embeddings = len(embeddings)
    if num_embeddings == 0:
        return []
        
    if num_embeddings == 1:
        return [(0.0, 0.0)]
        
    if num_embeddings == 2:
        return [(-1.0, 0.0), (1.0, 0.0)]
        
    # PCA Method
    if os.environ.get("ENV") != "production":
        try:
            from sklearn.decomposition import PCA
            X = np.array(embeddings)
            n_comp = min(2, num_embeddings)
            pca = PCA(n_components=n_comp, random_state=42)
            coords = pca.fit_transform(X)
            
            if coords.shape[1] < 2:
                # If only 1 component could be generated, pad with zeros
                return [(float(c[0]), 0.0) for c in coords]
            return [(float(c[0]), float(c[1])) for c in coords]
        except Exception as e:
            print(f"PCA projection failed, falling back to random projection: {e}")
            
    # Fallback: Deterministic Random Projection (Gaussian Random Matrix)
    # Project vectors onto 2 fixed random vectors
    rng = np.random.default_rng(1337)
    vector_len = len(embeddings[0])
    w1 = rng.standard_normal(vector_len)
    w2 = rng.standard_normal(vector_len)
    w1 = w1 / np.linalg.norm(w1)
    w2 = w2 / np.linalg.norm(w2)
    
    coords = []
    for emb in embeddings:
        v = np.array(emb)
        x = float(np.dot(v, w1))
        y = float(np.dot(v, w2))
        coords.append((x, y))
    return coords

def process_and_index_document(db: Session, doc_id: int):
    """
    Background worker function to extract text, chunk, generate embeddings,
    save chunks to DB, and upsert vectors to Qdrant.
    """
    document = db.get(Document, doc_id)
    if not document:
        print(f"Document with ID {doc_id} not found in database")
        return
        
    try:
        document.status = "processing"
        document.updated_at = datetime.utcnow()
        db.add(document)
        db.commit()
        
        # 1. Extract text and page metadata
        full_text, pages_metadata = extract_text_from_file(document.file_path, document.file_type)
        
        # Update page count
        document.page_count = len(pages_metadata)
        db.add(document)
        db.commit()
        
        # 2. Chunk text
        raw_chunks = chunk_text(pages_metadata)
        if not raw_chunks:
            raise ValueError("No text extracted from file or file is empty")
            
        # 3. Generate embeddings
        chunk_contents = [c["content"] for c in raw_chunks]
        embeddings = get_embeddings(chunk_contents)
        
        # 4. Generate 2D coordinates for visual maps
        coords_2d = project_embeddings_2d(embeddings)
        
        # 5. Connect to Qdrant and prepare points
        qdrant_client = get_qdrant_client()
        collection_name = "sourcesense_chunks"
        vector_size = len(embeddings[0])
        init_qdrant_collection(qdrant_client, collection_name, vector_size)
        
        points = []
        db_chunks = []
        
        for idx, rc in enumerate(raw_chunks):
            embedding_id = str(uuid.uuid4())
            emb = embeddings[idx]
            x_coord, y_coord = coords_2d[idx]
            
            # DB chunk
            chunk_record = Chunk(
                document_id=document.id,
                content=rc["content"],
                chunk_index=rc["chunk_index"],
                page_number=rc["page_number"],
                section_heading=rc["section_heading"],
                token_count=rc["token_count"],
                embedding_id=embedding_id,
                x_coord=x_coord,
                y_coord=y_coord
            )
            db_chunks.append(chunk_record)
            db.add(chunk_record)
            
            # Qdrant Point
            points.append(
                PointStruct(
                    id=embedding_id,
                    vector=emb,
                    payload={
                        "document_id": document.id,
                        "chunk_index": rc["chunk_index"],
                        "content": rc["content"],
                        "page_number": rc["page_number"],
                        "section_heading": rc["section_heading"] or ""
                    }
                )
            )
            
        # Write chunks to DB and commit
        db.commit()
        
        # Upsert to Qdrant (in batches)
        batch_size = 100
        for i in range(0, len(points), batch_size):
            qdrant_client.upsert(
                collection_name=collection_name,
                points=points[i:i+batch_size]
            )
            
        # 6. Mark document as ready
        document.chunk_count = len(raw_chunks)
        document.status = "ready"
        document.updated_at = datetime.utcnow()
        db.add(document)
        db.commit()
        print(f"Indexed document: {document.title} (ID: {doc_id}) with {len(raw_chunks)} chunks.")
        
    except Exception as e:
        db.rollback()
        document.status = "failed"
        document.updated_at = datetime.utcnow()
        db.add(document)
        db.commit()
        print(f"Failed to index document ID {doc_id}: {e}")
        import traceback
        traceback.print_exc()
