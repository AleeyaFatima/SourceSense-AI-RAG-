import re
from typing import List, Dict, Any, Tuple
import numpy as np

def split_into_sentences(text: str) -> List[str]:
    """Split text into sentences using simple regex."""
    # Matches sentence endings but avoids abbreviations
    sentence_endings = re.compile(r'(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)\s')
    sentences = sentence_endings.split(text)
    return [s.strip() for s in sentences if s.strip()]

def calculate_jaccard_similarity(str1: str, str2: str) -> float:
    """Calculates word-level Jaccard similarity between two strings."""
    words1 = set(re.findall(r'\w+', str1.lower()))
    words2 = set(re.findall(r'\w+', str2.lower()))
    if not words1 or not words2:
        return 0.0
    intersection = words1.intersection(words2)
    union = words1.union(words2)
    return len(intersection) / len(union)

def verify_citations(response_text: str, retrieved_chunks: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], float]:
    """
    Analyzes response text, finds citation tokens [1], [2], etc.,
    extracts the sentences containing them, and calculates support scores
    against the corresponding retrieved chunks.
    
    Returns:
      - citations_list: List of dicts representing each citation and its verification status
      - overall_faithfulness: Aggregated score (0 to 1) representing citation integrity
    """
    sentences = split_into_sentences(response_text)
    citations_analysis = []
    
    # We will search for brackets like [1], [2], [1, 2], [1,2] etc.
    citation_pattern = re.compile(r'\[([0-9]+(?:,\s*[0-9]+)*)\]')
    
    verified_count = 0
    total_citations_found = 0
    
    for sentence in sentences:
        matches = citation_pattern.findall(sentence)
        if not matches:
            continue
            
        # Extract individual citation indices (1-based index from LLM output)
        indices = []
        for m in matches:
            parts = m.split(',')
            for p in parts:
                idx = int(p.strip())
                indices.append(idx)
                
        for idx in indices:
            total_citations_found += 1
            # Check if index is valid for our retrieved chunks
            # LLM output is 1-indexed, chunks list is 0-indexed
            chunk_idx = idx - 1
            
            if chunk_idx < 0 or chunk_idx >= len(retrieved_chunks):
                # Out-of-bounds citation (hallucination)
                citations_analysis.append({
                    "citation_number": idx,
                    "sentence": sentence,
                    "status": "failed",  # failed, warning, verified
                    "confidence_score": 0.0,
                    "reason": "Cited source is out-of-bounds / does not exist",
                    "chunk_id": None
                })
                continue
                
            chunk = retrieved_chunks[chunk_idx]
            
            # Remove [1], [2] citation markers from sentence to score pure text similarity
            clean_sentence = citation_pattern.sub('', sentence).strip()
            
            # Calculate similarity score between sentence and chunk
            jaccard_score = calculate_jaccard_similarity(clean_sentence, chunk["content"])
            
            # Simple heuristic score based on word overlap
            # A score > 0.15 indicates moderate overlapping claims
            # A score > 0.35 indicates high overlapping claims/direct matches
            confidence = min(jaccard_score * 3.0, 1.0)  # scale for UI visibility
            
            # Adjust classification
            if confidence >= 0.70:
                status = "verified"
                reason = "Strong semantic and term overlap with source chunk"
                verified_count += 1
            elif confidence >= 0.30:
                status = "warning"
                reason = "Partial term overlap; check source chunk for context"
                verified_count += 0.5  # partial credit
            else:
                status = "failed"
                reason = "No meaningful term overlap detected (potential hallucination)"
                
            citations_analysis.append({
                "citation_number": idx,
                "sentence": sentence,
                "status": status,
                "confidence_score": float(confidence),
                "reason": reason,
                "chunk_id": chunk.get("embedding_id"),
                "document_title": chunk.get("document_title", "Unknown"),
                "page_number": chunk.get("page_number", 1)
            })
            
    # Calculate overall faithfulness score
    if total_citations_found == 0:
        # If no citations were generated but we had sources, that's not good, or if no claims, it's 1.0
        faithfulness_score = 1.0 if not sentences else 0.8
    else:
        faithfulness_score = verified_count / total_citations_found
        
    return citations_analysis, float(faithfulness_score)
