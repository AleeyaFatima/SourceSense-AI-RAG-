# RAG Pipeline & Retrieval Architecture

SourceSense AI implements a hybrid search retrieval pipeline combining sparse lexical keyword matching and dense vector embedding spaces.

## 1. Vector Ingestion and Embeddings
Incoming document chunks are mapped into high-dimensional vector space using the `all-MiniLM-L6-v2` embedding model. This model converts 512-token text passages into 384-dimensional dense vectors. These vectors capture the deep semantic context of sentences, permitting similarity search based on meaning rather than literal keyword matches.

## 2. Sparse Lexical Search (BM25)
To ensure high accuracy for specific technical IDs, product names, or serial numbers, the system runs a parallel lexical search using the BM25 (Okapi) algorithm. BM25 scores each chunk based on exact term frequencies, document lengths, and inverse document frequency statistics.

## 3. Reciprocal Rank Fusion (RRF)
To combine dense and sparse outputs, the system applies Reciprocal Rank Fusion (RRF). RRF merges the ranked candidates of dense search and BM25 search. 
The RRF score formula is:
RRF(d) = sum_{m in M} (1 / (k + rank_m(d)))
where the constant parameter is configured as k=60. Chunks that rank highly in both Dense search and BM25 search obtain high combined scores.

## 4. Cross-Encoder Reranking
The top 15 fused candidate chunks from RRF are sent to a local Cross-Encoder reranker based on the `cross-encoder/ms-marco-MiniLM-L-6-v2` model. Unlike bi-encoders, the cross-encoder processes the query and the chunk text together, calculating a precise relevance score. The top 5 highest-scoring chunks are selected as the final LLM prompt context.
