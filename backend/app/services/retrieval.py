import re
from typing import List, Dict, Any
from sqlmodel import Session, select
import numpy as np

# Try rank-bm25 import
try:
    from rank_bm25 import BM25Okapi
except ImportError:
    BM25Okapi = None

# Try sentence-transformers for Reranking
try:
    from sentence_transformers import CrossEncoder
except ImportError:
    CrossEncoder = None

from app.core.config import settings
from app.models.models import Chunk, Document
from app.services.ingestion import get_embeddings, get_qdrant_client

# Global Cross-Encoder Model Cache
_reranker_model = None

def get_reranker_model():
    global _reranker_model
    import os
    # Disable heavy local ML model on memory-constrained Render free tier
    if os.environ.get("ENV") == "production":
        return None
    if settings.RERANKER_PROVIDER == "none" or CrossEncoder is None:
        return None
    if _reranker_model is None:
        try:
            _reranker_model = CrossEncoder(settings.RERANKER_MODEL_NAME)
        except Exception as e:
            print(f"Error loading local CrossEncoder reranker: {e}")
            _reranker_model = None
    return _reranker_model

def tokenize(text: str) -> List[str]:
    """Helper tokenizer for BM25 (lowercased words)."""
    return re.findall(r'\w+', text.lower())

def run_dense_search(query_vector: List[float], top_n: int = 25) -> List[Dict[str, Any]]:
    """Runs a semantic search against Qdrant collection."""
    try:
        qdrant_client = get_qdrant_client()
        collection_name = "sourcesense_chunks"
        
        # Check if collection exists first
        collections = qdrant_client.get_collections().collections
        if not any(c.name == collection_name for c in collections):
            return []
            
        results = qdrant_client.search(
            collection_name=collection_name,
            query_vector=query_vector,
            limit=top_n
        )
        
        search_results = []
        for res in results:
            payload = res.payload
            search_results.append({
                "embedding_id": res.id,
                "document_id": payload.get("document_id"),
                "chunk_index": payload.get("chunk_index"),
                "content": payload.get("content"),
                "page_number": payload.get("page_number", 1),
                "section_heading": payload.get("section_heading", ""),
                "score": float(res.score)
            })
        return search_results
    except Exception as e:
        print(f"Qdrant dense search failed: {e}")
        return []

def run_bm25_search(db: Session, query: str, top_n: int = 25) -> List[Dict[str, Any]]:
    """Runs BM25 keyword search over all database chunks."""
    if BM25Okapi is None:
        print("Warning: rank-bm25 not installed, skipping BM25 keyword search")
        return []
        
    # Get all active chunks
    statement = select(Chunk).join(Document).where(Document.status == "ready")
    chunks = db.exec(statement).all()
    
    if not chunks:
        return []
        
    # Tokenize corpus
    corpus = [tokenize(c.content) for c in chunks]
    bm25 = BM25Okapi(corpus)
    
    # Score query
    tokenized_query = tokenize(query)
    scores = bm25.get_scores(tokenized_query)
    
    # Sort and pick top N
    top_indices = np.argsort(scores)[::-1][:top_n]
    
    search_results = []
    for rank, idx in enumerate(top_indices):
        score = float(scores[idx])
        if score <= 0.0:  # Skip completely irrelevant matches
            continue
            
        chunk = chunks[idx]
        search_results.append({
            "embedding_id": chunk.embedding_id,
            "document_id": chunk.document_id,
            "chunk_index": chunk.chunk_index,
            "content": chunk.content,
            "page_number": chunk.page_number,
            "section_heading": chunk.section_heading or "",
            "score": score
        })
    return search_results

def reciprocal_rank_fusion(dense_results: List[Dict[str, Any]], bm25_results: List[Dict[str, Any]], k: int = 60, top_n: int = 15) -> List[Dict[str, Any]]:
    """
    Blends dense and BM25 search rankings using Reciprocal Rank Fusion.
    """
    rrf_scores = {}
    chunk_lookup = {}
    
    # Process Dense Search results
    for rank, item in enumerate(dense_results):
        emb_id = item["embedding_id"]
        chunk_lookup[emb_id] = item
        # RRF formula: 1 / (k + rank)
        rrf_scores[emb_id] = rrf_scores.get(emb_id, 0.0) + (1.0 / (k + (rank + 1)))
        
    # Process BM25 Search results
    for rank, item in enumerate(bm25_results):
        emb_id = item["embedding_id"]
        chunk_lookup[emb_id] = item
        rrf_scores[emb_id] = rrf_scores.get(emb_id, 0.0) + (1.0 / (k + (rank + 1)))
        
    # Sort chunks by final RRF score descending
    sorted_chunk_ids = sorted(rrf_scores.keys(), key=lambda x: rrf_scores[x], reverse=True)[:top_n]
    
    fused_results = []
    for rank, emb_id in enumerate(sorted_chunk_ids):
        item = chunk_lookup[emb_id].copy()
        item["rrf_score"] = float(rrf_scores[emb_id])
        item["rrf_rank"] = rank + 1
        fused_results.append(item)
        
    return fused_results

def run_reranking(query: str, fused_results: List[Dict[str, Any]], top_n: int = 5) -> List[Dict[str, Any]]:
    """
    Reranks the fused results using a CrossEncoder model.
    Falls back to original ranks if the model is not loaded.
    """
    if not fused_results:
        return []
        
    reranker = get_reranker_model()
    if reranker is not None:
        try:
            # Prepare query-chunk pairs
            pairs = [[query, item["content"]] for item in fused_results]
            scores = reranker.predict(pairs)
            
            # Update scores in results
            for idx, score in enumerate(scores):
                fused_results[idx]["rerank_score"] = float(score)
                
            # Sort by rerank score descending
            reranked_results = sorted(fused_results, key=lambda x: x["rerank_score"], reverse=True)[:top_n]
            return reranked_results
        except Exception as e:
            print(f"Reranking error: {e}, falling back to RRF order")
            
    # Fallback to simple cosine similarity reranking if embeddings are available
    # Or just keep RRF order but limit to top_n
    for idx, item in enumerate(fused_results):
        item["rerank_score"] = item.get("rrf_score", 1.0 / (idx + 1))
        
    return fused_results[:top_n]

def hybrid_retrieve(db: Session, query: str) -> Dict[str, Any]:
    """
    Complete hybrid retrieval pipeline:
    1. Query embedding + dense search (Qdrant)
    2. BM25 keyword search (Postgres/SQLite Chunks)
    3. RRF Fusion
    4. Cross-encoder Reranking
    Returns final retrieved chunks + full pipeline trace metadata.
    """
    # 1. Generate query embedding
    query_vector = get_embeddings([query])[0]
    
    # 2. Parallel searches
    dense_results = run_dense_search(query_vector, top_n=25)
    bm25_results = run_bm25_search(db, query, top_n=25)
    
    # 3. Reciprocal Rank Fusion
    fused_results = reciprocal_rank_fusion(dense_results, bm25_results, k=60, top_n=15)
    
    # 4. Reranking
    final_results = run_reranking(query, fused_results, top_n=5)
    
    # Fetch original document titles to show in results
    doc_ids = list(set([item["document_id"] for item in final_results if item.get("document_id")]))
    doc_titles = {}
    if doc_ids:
        docs = db.exec(select(Document).where(Document.id.in_(doc_ids))).all()
        doc_titles = {d.id: d.title for d in docs}
        
    for item in final_results:
        item["document_title"] = doc_titles.get(item["document_id"], "Unknown Document")
        
    # Return results and retrieval trace details
    return {
        "results": final_results,
        "trace": {
            "dense_count": len(dense_results),
            "bm25_count": len(bm25_results),
            "fused_count": len(fused_results),
            "reranked_count": len(final_results),
            "dense_results": [
                {"content": d["content"][:60] + "...", "score": d["score"], "doc_id": d["document_id"]} 
                for d in dense_results[:5]
            ],
            "bm25_results": [
                {"content": b["content"][:60] + "...", "score": b["score"], "doc_id": b["document_id"]} 
                for b in bm25_results[:5]
            ]
        }
    }
