# SourceSense AI — Restructured Spec

### Enterprise Knowledge Copilot with Verified Citations

---

## What This Project Proves

A portfolio project needs to answer one question in 30 seconds: "Can this person build real things?" SourceSense answers it by demonstrating a production-grade RAG pipeline with hybrid retrieval, citation verification, and a clean interface that gets out of the way. The AI engineering is the star — the UI serves it, not the other way around.


---

## Design Direction

**Reference points:** Linear, Vercel, Notion, Stripe Dashboard — not Palantir, not crypto.

The interface should feel like a tool someone would actually use at work. That means clarity over spectacle, fast interactions over cinematic transitions, and consistent spacing over decorative elements.

**Dark theme with gold accent — used with restraint.**

Gold appears in exactly these places: active nav indicator, primary action buttons, confidence scores, chart highlights, and focus rings. Everything else is grayscale. If you're unsure whether something should be gold, it shouldn't be.

### Color System

| Token            | Hex       | Usage                                      |
|------------------|-----------|---------------------------------------------|
| `--bg-primary`   | `#0A0A0A` | Page background                             |
| `--bg-card`      | `#141414` | Cards, panels, chat bubbles                 |
| `--bg-surface`   | `#1C1C1C` | Elevated containers, modals, dropdowns      |
| `--border`       | `#262626` | Subtle dividers, card edges                 |
| `--gold`         | `#D4AF37` | Primary accent — buttons, active states     |
| `--gold-muted`   | `#8A6A12` | Secondary accent — icons, inactive elements |
| `--text-primary` | `#F5F5F5` | Headings, body text                         |
| `--text-muted`   | `#737373` | Labels, timestamps, placeholders            |
| `--success`      | `#4ADE80` | Confidence above 80%, pass indicators       |
| `--warning`      | `#FBBF24` | Confidence 50–80%                           |
| `--error`        | `#EF4444` | Failures, confidence below 50%              |

### Typography

**Display/Headings:** Plus Jakarta Sans (600, 700) — distinctive but legible, works well at dashboard scale.

**Body:** Inter (400, 500) — the workhorse. Clean at small sizes, solid for data-heavy views.

**Monospace:** JetBrains Mono (400) — code blocks, confidence percentages, latency numbers, chunk IDs.

Set a proper type scale. Don't freehand font sizes — pick a ratio (1.25 or 1.333) and stick to it. Consistent sizing separates professional dashboards from hobby projects.


---

## Scope — What You're Actually Building

This is the critical change. The original spec describes 8+ pages, 3D scenes on every route, Redis caching, admin panels, and version history. That's a 6-month product, not a portfolio project. Ship four polished pages instead.

### Page 1: Dashboard Home

Key metrics at a glance. This page should load fast and communicate health immediately.

**Content:** Total documents indexed, total questions answered, average confidence score, average latency, system status (API health, vector DB status, embedding model). A small "recent queries" list showing the last 5–10 questions with their confidence scores. A single chart — confidence score distribution over time, or questions per day. That's it.

**What NOT to put here:** An animated globe. A floating AI brain. A particle background. These add nothing that helps a recruiter understand what the project does.

### Page 2: AI Chat (the hero)

This is the page people will actually interact with. It needs to be flawless.

**Core features:** Streaming responses with markdown rendering (headings, bold, code blocks, tables). Inline citation markers ([1], [2], etc.) that highlight on hover and link to the source chunk. A confidence meter that fills in real-time as the response streams. An expandable "Sources" panel below each response showing the retrieved chunks with their relevance scores, which document they came from, and the page/section number.

**Stretch features (build after core works):** Regenerate button. Copy response. Export conversation as markdown. A "retrieval details" toggle that shows a simple pipeline breakdown — how many chunks were retrieved at each stage (dense search → BM25 → fusion → reranked → final context). This is not a 3D animation; it's a small, well-designed sidebar or collapsible section showing numbers.

**What makes this impressive:** The retrieval transparency. Most RAG demos just show an answer. Yours shows the work: which chunks were selected, why, and how confident the system is about each citation. That's what separates a portfolio piece from a tutorial follow-along.

### Page 3: Knowledge Base

Where users see what's been indexed and upload new documents.

**Content:** A clean grid of document cards. Each card shows: document title, file type icon, page count, chunk count, upload date, and processing status (processing / ready / failed). Click a card to see its chunks with their embeddings visualized (a simple 2D scatter plot using UMAP/t-SNE, not a 3D graph). An upload zone with drag-and-drop, progress indicator, and clear error messaging if a file type isn't supported.

**Views:** Grid and list toggle. No timeline view — it doesn't add value for this use case.

### Page 4: Evaluation & Analytics

Prove the system works with real metrics.

**Evaluation section:** Retrieval precision, faithfulness score, answer relevance, citation accuracy, hallucination rate. Show these as a simple scorecard with current values and a pass/fail indicator. If you're using RAGAS or DeepEval, show their output directly rather than inventing custom visualizations.

**Analytics section:** Questions over time (line chart), average confidence over time (line chart), latency distribution (histogram or box plot), most queried documents (bar chart). Use Recharts. Four charts max — each one should tell a clear story.

**What NOT to build here:** A 3D knowledge graph. Interactive node-link diagrams look impressive in screenshots but are nearly useless for actual analysis, and they take weeks to get right. A 2D scatter plot of document embeddings (colored by category) is faster to build and more informative.


---

## The One Visual Moment

You're allowed one piece of visual flair. Pick one of these — not all of them:

**Option A: Landing/login page hero.** A subtle animated mesh gradient or a slowly morphing abstract shape in gold on black. The user sees it once when they open the app. It sets the tone without affecting performance on the actual dashboard. This is the Linear/Vercel approach.

**Option B: Retrieval flow animation on the chat page.** When a query is submitted, a small horizontal pipeline visualization lights up each stage (embed → search → fuse → rerank → generate → verify) as it completes. This is functional — it shows the user what's happening — and it's visually interesting. Build it with Framer Motion, not Three.js.

**Option C: Embedding space visualization on the Knowledge Base page.** A 2D scatter plot of document chunks in embedding space, colored by source document, with the query point highlighted when someone searches. Interactive (zoom, pan, hover for chunk text). Built with D3 or a canvas library.

Any of these is enough. The rest of the UI should be quiet, fast, and focused.


---

## AI Pipeline Architecture (unchanged — this is strong)

```
Question
  │
  ▼
Embedding Model (BGE-large or OpenAI text-embedding-3-small)
  │
  ├──► Dense Search (Qdrant) → Top 25
  │
  ├──► BM25 Search (keyword) → Top 25
  │
  ▼
Reciprocal Rank Fusion → Top 15
  │
  ▼
Cross-Encoder Reranker (ms-marco-MiniLM) → Top 5
  │
  ▼
Context Builder (format chunks + metadata for prompt)
  │
  ▼
LLM (GPT-4o / Claude / local via config)
  │
  ▼
Citation Verification Engine
  │  - For each claim, check if the cited chunk actually supports it
  │  - Flag unsupported claims
  │  - Calculate per-citation confidence
  │
  ▼
Confidence Score (weighted: retrieval relevance + citation verification + answer coherence)
  │
  ▼
Verified Response with inline citations
```

This pipeline is the project's core value. Every design decision should make it easier to understand and demonstrate, not harder.


## Document Ingestion Pipeline

```
Upload (PDF, DOCX, TXT, MD)
  │
  ▼
File Validation & Type Detection
  │
  ▼
Text Extraction (PyMuPDF for PDF, python-docx for DOCX)
  │
  ▼
Cleaning (remove headers/footers, normalize whitespace, fix encoding)
  │
  ▼
Chunking (recursive character splitter, 512 tokens, 50 token overlap)
  │
  ▼
Metadata Extraction (title, author, page number, section heading, file hash)
  │
  ▼
Embedding Generation (batch process)
  │
  ▼
Qdrant Upsert (vectors + metadata payload)
  │
  ▼
PostgreSQL Record (document metadata, chunk count, processing status)
```


---

## Tech Stack (trimmed)

| Layer            | Technology                                | Why                                                        |
|------------------|-------------------------------------------|------------------------------------------------------------|
| Frontend         | Next.js 15, React 19, TypeScript          | Industry standard, SSR for initial load, App Router        |
| Styling          | Tailwind CSS + shadcn/ui                  | Rapid, consistent, accessible components out of the box    |
| Animation        | Framer Motion                             | One library. Handles layout animations, page transitions, micro-interactions |
| Charts           | Recharts                                  | React-native, composable, handles the 4 chart types needed |
| Backend          | FastAPI                                   | Async, fast, auto-generated OpenAPI docs                   |
| Database         | PostgreSQL (Neon)                         | Documents, users, conversations, evaluation logs           |
| Vector Database  | Qdrant                                    | Hybrid search support, filtering, payload storage          |
| Embeddings       | BAAI/bge-large-en-v1.5 or OpenAI          | BGE for cost control, OpenAI as premium option             |
| Reranker         | cross-encoder/ms-marco-MiniLM-L-6-v2     | Fast, effective, well-documented                           |
| LLM              | Configurable (OpenAI, Anthropic, local)   | Shows flexibility — let users pick in settings             |
| Evaluation       | RAGAS                                     | One framework. Don't split across RAGAS + DeepEval         |
| Deployment       | Vercel (frontend) + Render (backend)      | Free tiers, simple CI/CD                                   |

**What was removed and why:**

GSAP, React Spring, React Three Fiber, Drei, Three.js — you don't need four animation/3D libraries. Framer Motion covers everything this project requires.

Redis — adds operational complexity. Use FastAPI's built-in response caching or lru_cache for hot paths. Add Redis later if you have a specific caching story to tell (and show cache hit rate metrics).

LangGraph — unless you're building multi-step agentic workflows (you're not, this is a single-turn RAG pipeline), it adds abstraction without value. A clean Python function chain is more readable and more impressive to reviewers who'll read your code.

DeepEval — pick one evaluation framework. RAGAS is more widely known and gives you retrieval precision, faithfulness, answer relevance, and context recall. That's sufficient.


---

## Database Schema (simplified)

**users** — id, email, name, hashed_password, created_at

**documents** — id, user_id, title, file_type, file_path, page_count, chunk_count, status (processing/ready/failed), created_at, updated_at

**chunks** — id, document_id, content, chunk_index, page_number, section_heading, token_count, embedding_id (reference to Qdrant point ID)

**conversations** — id, user_id, title, created_at

**messages** — id, conversation_id, role (user/assistant), content, citations (JSONB), confidence_score, retrieval_metadata (JSONB — stores which chunks were retrieved, scores at each pipeline stage), latency_ms, model_used, created_at

**evaluations** — id, message_id, retrieval_precision, faithfulness, answer_relevance, citation_accuracy, created_at

Six tables. Each one earns its place. The JSONB fields on messages are important — they store the full retrieval trace so you can show pipeline details in the UI without extra queries.


---

## What the Original Spec Was Missing

These are the things that actually matter for a portfolio project and were absent from the original document:

**Error states.** What does the chat show when the API is down? When Qdrant is unreachable? When a document fails to process? Design these. A well-handled error state tells a reviewer more about your engineering maturity than any 3D animation.

**Empty states.** What does the Knowledge Base look like with zero documents? What does the chat look like before any conversation? These should guide the user toward action ("Upload your first document to get started"), not just show a blank page.

**Loading patterns.** Skeleton screens for the dashboard. A typing indicator for chat. Progress bars for document processing. Optimistic updates where appropriate. These are the details that make something feel like a product.

**Mobile responsiveness.** The dashboard should be usable on a phone. The sidebar collapses. The chat is full-width. Charts stack vertically. This doesn't need to be perfect, but it needs to not be broken.

**Accessibility.** Keyboard navigation through the sidebar. Focus rings (gold, since that's your accent). Proper ARIA labels on interactive elements. Sufficient color contrast (your gold on dark backgrounds needs testing). Screen reader support for the confidence meter.

**README and documentation.** A clear README with: what the project does (one paragraph), a screenshot, architecture diagram, setup instructions, environment variables needed, and a "design decisions" section explaining why you chose hybrid retrieval over pure vector search, why you added citation verification, and what RAGAS metrics you're tracking. This section is where you demonstrate understanding, and many recruiters read the README before they ever run the project.

**Demo data.** Ship the project with a pre-loaded knowledge base — 10-20 documents on a specific topic (ML papers, company policies, API documentation). A reviewer should be able to clone the repo, run docker compose up, and immediately ask questions. If they have to find and upload their own documents first, most will close the tab.


---

## Build Order

This is the order that gets you to a demoable state fastest.

**Phase 1 — Working RAG pipeline (Week 1–2).** FastAPI backend, document ingestion, chunking, embedding, Qdrant storage, hybrid retrieval, basic LLM generation with citations. Test with curl. No frontend yet.

**Phase 2 — Chat interface (Week 3).** Next.js app with the chat page only. Streaming responses, markdown rendering, citation display, confidence score. This is your MVP — if you stop here, you still have a strong portfolio piece.

**Phase 3 — Knowledge Base + Dashboard (Week 4).** Document upload UI, document cards, dashboard metrics. Pull real data from the backend — don't mock anything.

**Phase 4 — Evaluation + Polish (Week 5).** RAGAS integration, evaluation scorecard, analytics charts. Error states, empty states, loading states. Mobile pass. README.

**Phase 5 — Visual polish (Week 6).** Your one visual moment (pick from the options above). Page transitions. Micro-interactions on hover/focus. Final color and spacing audit.

The key principle: at the end of every phase, the project is demoable. You're never in a state where nothing works because you're building the 3D globe and the chat simultaneously.


---

## What "Done" Looks Like

A reviewer clones the repo, runs it, and within 60 seconds:

They see a clean dashboard with real metrics. They click into Chat, type a question, and watch a streaming response appear with inline citations and a confidence score. They click a citation and see the exact source chunk. They browse the Knowledge Base and see indexed documents with chunk counts. They check the Evaluation page and see RAGAS scores. The README explains the architecture clearly.

They think: "This person can build production AI systems and ship clean products."

That's the goal. Everything in this spec serves it. Everything that doesn't was cut.
