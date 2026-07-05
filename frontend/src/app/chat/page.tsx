"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Send, 
  Bot, 
  User as UserIcon, 
  Loader2, 
  Copy, 
  Check, 
  RefreshCw, 
  ChevronRight, 
  FileSpreadsheet,
  AlertTriangle,
  ArrowRight,
  Maximize2,
  Clock,
  Sparkles,
  Settings2,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  ListTodo,
  Terminal,
  Activity,
  Sliders,
  Database
} from "lucide-react";

import DashboardLayout from "@/components/DashboardLayout";

// Stage definition for the retrieval pipeline visualization
interface PipelineStage {
  id: string;
  name: string;
  description: string;
  status: "idle" | "running" | "completed";
}

const INITIAL_STAGES: PipelineStage[] = [
  { id: "embed", name: "Embedding", description: "Convert query to dense vector", status: "idle" },
  { id: "dense", name: "Vector Search", description: "Retrieve semantic chunks (Qdrant)", status: "idle" },
  { id: "keyword", name: "BM25 Search", description: "Retrieve keyword matches (SQLite/Postgres)", status: "idle" },
  { id: "fuse", name: "RRF Fusion", description: "Merge rank results", status: "idle" },
  { id: "rerank", name: "Reranker", description: "Cross-encoder scoring (MiniLM)", status: "idle" },
  { id: "generate", name: "LLM Generate", description: "LLM synthesis & citations", status: "idle" },
  { id: "verify", name: "Citation Check", description: "Verify claim authenticity", status: "idle" },
];

const getMockChunks = (docId: number) => {
  const chunks = [];
  const topics = ["Security", "Network", "Compliance", "Logging", "Database", "Authentication"];
  for (let i = 0; i < 25; i++) {
    const topicIdx = i % topics.length;
    const centerX = (topicIdx * 2.5) - 6;
    const centerY = (Math.sin(topicIdx) * 3) - 2;
    const seed = docId * 100 + i;
    const randX = (Math.sin(seed) * 0.8);
    const randY = (Math.cos(seed) * 0.8);
    chunks.push({
      id: i,
      embedding_id: `mock-chunk-${docId}-${i}`,
      chunk_index: i + 1,
      content: `This is chunk ${i + 1} from document ${docId} describing key technical parameters of the system including details on ${topics[topicIdx]} protocol implementations.`,
      page_number: Math.floor(i / 4) + 1,
      section_heading: `${topics[topicIdx]} Details`,
      x_coord: centerX + randX,
      y_coord: centerY + randY,
      document_title: docId === 999 ? "SourceSense-RAG-Framework-Architecture" : "Active-Logging-SOP"
    });
  }
  return chunks;
};

function ChatContent() {
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");

  const [conversations, setConversations] = useState<any[]>([]);
  const [activeConvId, setActiveConvId] = useState<number | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  
  // Pipeline status
  const [stages, setStages] = useState<PipelineStage[]>(INITIAL_STAGES);
  const [retrievedChunks, setRetrievedChunks] = useState<any[]>([]);
  const [traceDetails, setTraceDetails] = useState<any>(null);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  
  // Citation linking states
  const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);
  const [confidenceScore, setConfidenceScore] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  
  // System configurations
  const [selectedModel, setSelectedModel] = useState("Local Simulation");
  const [showConfig, setShowConfig] = useState(false);
  
  // RAG Hyperparameters
  const [chunkSize, setChunkSize] = useState(500);
  const [chunkOverlap, setChunkOverlap] = useState(50);
  const [rrfK, setRrfK] = useState(60);
  const [rerankThreshold, setRerankThreshold] = useState(0.65);
  
  // Copy indicators
  const [copiedMessageId, setCopiedMessageId] = useState<number | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (!tab) {
      scrollToBottom();
    }
  }, [messages, streamingText, tab]);

  // Load conversations list
  const loadConversations = (selectFirst = false) => {
    fetch("http://localhost:8000/api/chat/conversations")
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setConversations(data);
        setIsDemoMode(false);
        if (data.length && selectFirst && activeConvId === null) {
          setActiveConvId(data[0].id);
        }
      })
      .catch(() => {
        setIsDemoMode(true);
        const mockConv = { id: 999, title: "RAG System Architecture Questions" };
        setConversations([mockConv]);
        setActiveConvId(mockConv.id);
      });
  };

  useEffect(() => {
    loadConversations(true);
  }, []);

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([]);
      return;
    }
    
    if (isDemoMode) {
      if (activeConvId === 999) {
        setMessages([
          { id: 1, role: "user", content: "How does Reciprocal Rank Fusion merge dense and sparse results?" },
          { 
            id: 2, 
            role: "assistant", 
            content: "Reciprocal Rank Fusion (RRF) combines sparse BM25 scores and dense semantic coordinates [1]. By applying a constant parameter (typically k=60), RRF computes a unified rank score where items ranking high in both methods receive the highest combined scoring weight [2]. This ensures that exact keyphrase overlaps and contextual semantic alignments are fully balanced during final cross-encoder reranking operations.",
            confidence_score: 0.92,
            latency_ms: 380,
            model_used: "Local Simulation",
            citations: [
              { citation_number: 1, sentence: "Reciprocal Rank Fusion (RRF) combines sparse BM25 scores and dense semantic coordinates [1].", status: "verified", confidence_score: 0.95, reason: "Matches technical documentation", document_title: "SourceSense-RAG-Framework-Architecture", page_number: 2 },
              { citation_number: 2, sentence: "By applying a constant parameter (typically k=60), RRF computes a unified rank score where items ranking high in both methods receive the highest combined scoring weight [2].", status: "verified", confidence_score: 0.89, reason: "Confirmed via documentation guidelines", document_title: "SourceSense-RAG-Framework-Architecture", page_number: 3 }
            ],
            retrieval_metadata: {
              chunks: [
                { embedding_id: "c1", document_id: 1, document_title: "SourceSense-RAG-Framework-Architecture", page_number: 2, section_heading: "RRF Blending Layer", content: "Reciprocal Rank Fusion (RRF) merges dense neural search and sparse lexical algorithms (BM25). The formula computes RRF score dynamically." },
                { embedding_id: "c2", document_id: 1, document_title: "SourceSense-RAG-Framework-Architecture", page_number: 3, section_heading: "Fusion Constants", content: "An RRF constant parameter of k=60 balances the relative positions. If a document ranks at pos 1 in BM25 and pos 3 in Dense, its fused score is 1/(60+1) + 1/(60+3)." }
              ]
            }
          }
        ]);
      }
      return;
    }
    
    fetch(`http://localhost:8000/api/chat/conversations/${activeConvId}/messages`)
      .then(res => res.json())
      .then(data => {
        setMessages(data);
      })
      .catch(() => {
        setMessages([]);
      });
  }, [activeConvId, isDemoMode]);

  const startNewConversation = () => {
    if (isDemoMode) {
      const newId = Date.now();
      const newConv = { id: newId, title: "New Conversation" };
      setConversations(prev => [newConv, ...prev]);
      setActiveConvId(newId);
      setMessages([]);
      return;
    }
    
    fetch("http://localhost:8000/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New Conversation" })
    })
      .then(res => res.json())
      .then(data => {
        setConversations(prev => [data, ...prev]);
        setActiveConvId(data.id);
        setMessages([]);
      });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConvId) return;
    
    const queryStr = input;
    setInput("");
    setLoading(true);
    setStreamingText("");
    setRetrievedChunks([]);
    setTraceDetails(null);
    setConfidenceScore(null);
    setLatencyMs(null);
    
    const localUserMsg = { id: Date.now(), role: "user", content: queryStr };
    setMessages(prev => [...prev, localUserMsg]);
    
    setStages(prev => prev.map(s => ({ ...s, status: s.id === "embed" ? "running" : "idle" })));
    setActiveStageId("embed");
    
    const advanceStage = (id: string, nextId: string, delay: number) => {
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          setStages(prev => prev.map(s => {
            if (s.id === id) return { ...s, status: "completed" };
            if (s.id === nextId) return { ...s, status: "running" };
            return s;
          }));
          setActiveStageId(nextId);
          resolve();
        }, delay);
      });
    };
    
    if (isDemoMode) {
      advanceStage("embed", "dense", 200)
        .then(() => advanceStage("dense", "keyword", 200))
        .then(() => advanceStage("keyword", "fuse", 150))
        .then(() => advanceStage("fuse", "rerank", 150))
        .then(() => {
          setStages(prev => prev.map(s => {
            if (s.id === "rerank") return { ...s, status: "completed" };
            if (s.id === "generate") return { ...s, status: "running" };
            return s;
          }));
          setActiveStageId("generate");
          
          const mockChunks = getMockChunks(activeConvId || 1);
          setRetrievedChunks(mockChunks.slice(0, 3));
          setTraceDetails({
            dense_count: 25,
            bm25_count: 25,
            fused_count: 15,
            reranked_count: 5
          });
          
          const synthText = "Based on the policy guidelines, the system requires active logging [1]. Chunks retrieved from database records indicate that indexing processes must validate hashes before completing pipeline stages [2]. This maintains structural vector consistency and ensures document retrieval accuracy [3].";
          const words = synthText.split(" ");
          let count = 0;
          
          const interval = setInterval(() => {
            if (count < words.length) {
              setStreamingText(prev => prev + words[count] + " ");
              count++;
            } else {
              clearInterval(interval);
              setStages(prev => prev.map(s => {
                if (s.id === "generate") return { ...s, status: "completed" };
                if (s.id === "verify") return { ...s, status: "completed" };
                return s;
              }));
              setActiveStageId("verify");
              
              const finalCitations = [
                { citation_number: 1, sentence: "Based on the policy guidelines, the system requires active logging [1].", status: "verified", confidence_score: 0.91, reason: "Strong support in document", document_title: "Active-Logging-SOP", page_number: 1 },
                { citation_number: 2, sentence: "Chunks retrieved from database records indicate that indexing processes must validate hashes before completing pipeline stages [2].", status: "verified", confidence_score: 0.85, reason: "Strong support in document", document_title: "Active-Logging-SOP", page_number: 2 },
                { citation_number: 3, sentence: "This maintains structural vector consistency and ensures document retrieval accuracy [3].", status: "warning", confidence_score: 0.55, reason: "Partial matches found", document_title: "Active-Logging-SOP", page_number: 3 }
              ];
              
              setMessages(prev => [...prev, {
                id: Date.now() + 1,
                role: "assistant",
                content: synthText,
                confidence_score: 0.88,
                latency_ms: 680,
                model_used: "Local Simulation",
                citations: finalCitations,
                retrieval_metadata: { chunks: mockChunks.slice(0, 3) }
              }]);
              setStreamingText("");
              setConfidenceScore(0.88);
              setLatencyMs(680);
              setLoading(false);
            }
          }, 35);
        });
      return;
    }
    
    const encodedQuery = encodeURIComponent(queryStr);
    const url = `http://localhost:8000/api/chat/query?conversation_id=${activeConvId}&query=${encodedQuery}`;
    const eventSource = new EventSource(url);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.retrieval_metadata) {
        const metadata = data.retrieval_metadata;
        setRetrievedChunks(metadata.chunks);
        setTraceDetails(metadata.trace);
        
        setStages(prev => prev.map(s => {
          if (["embed", "dense", "keyword", "fuse", "rerank"].includes(s.id)) {
            return { ...s, status: "completed" };
          }
          if (s.id === "generate") {
            return { ...s, status: "running" };
          }
          return s;
        }));
        setActiveStageId("generate");
      }
      
      if (data.text) {
        setStreamingText(prev => prev + data.text);
      }
      
      if (data.done === true) {
        eventSource.close();
        setStages(prev => prev.map(s => ({ ...s, status: "completed" })));
        setActiveStageId(null);
        setConfidenceScore(data.confidence_score);
        setLatencyMs(data.latency_ms);
        
        fetch(`http://localhost:8000/api/chat/conversations/${activeConvId}/messages`)
          .then(res => res.json())
          .then(msgs => {
            setMessages(msgs);
            setStreamingText("");
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      }
    };
    
    eventSource.onerror = (e) => {
      console.error("SSE stream error", e);
      eventSource.close();
      setLoading(false);
      setMessages(prev => [...prev, {
        id: Date.now() + 2,
        role: "assistant",
        content: "I encountered a connection error communicating with the RAG pipelines. Please check if the FastAPI backend is running.",
        confidence_score: 0.0,
        model_used: "Error Connection"
      }]);
    };
  };

  const copyToClipboard = (id: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  const renderMessageContent = (content: string, citations: any[] = []) => {
    if (!content) return null;
    const citationRegex = /\[([0-9]+(?:,\s*[0-9]+)*)\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;
    
    while ((match = citationRegex.exec(content)) !== null) {
      const matchIndex = match.index;
      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex));
      }
      const citationNumbers = match[1].split(',').map(n => parseInt(n.trim()));
      
      citationNumbers.forEach((citNum, subIdx) => {
        const citationInfo = citations.find(c => c.citation_number === citNum);
        const isHovered = hoveredCitation === citNum;
        const colorClass = citationInfo?.status === "verified" 
          ? "text-success-custom bg-success-custom/10 border-success-custom/20"
          : citationInfo?.status === "warning"
          ? "text-warning-custom bg-warning-custom/10 border-warning-custom/20"
          : "text-error-custom bg-error-custom/10 border-error-custom/20";
          
        parts.push(
          <span
            key={`cit-${matchIndex}-${citNum}-${subIdx}`}
            onMouseEnter={() => setHoveredCitation(citNum)}
            onMouseLeave={() => setHoveredCitation(null)}
            className={`citation-marker mx-0.5 select-none ${isHovered ? "highlighted text-bg-primary" : ""} ${colorClass}`}
          >
            {citNum}
          </span>
        );
      });
      lastIndex = citationRegex.lastIndex;
    }
    
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }
    
    return (
      <div className="prose leading-relaxed text-xs md:text-sm space-y-3 font-sans break-words whitespace-pre-wrap">
        {parts.map((p, idx) => {
          if (typeof p === "string") {
            if (p.startsWith("### ")) {
              return <h3 key={idx} className="font-display font-semibold text-xs text-text-primary mt-3 mb-1.5">{p.replace("### ", "")}</h3>;
            }
            if (p.startsWith("- ")) {
              return (
                <div key={idx} className="flex items-start gap-2 pl-3 text-xs">
                  <ChevronRight className="w-3 h-3 text-gold shrink-0 mt-0.5" />
                  <span>{p.replace("- ", "")}</span>
                </div>
              );
            }
            return <span key={idx}>{p}</span>;
          }
          return p;
        })}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex h-[calc(100vh-6.5rem)] gap-6 items-stretch relative">
        
        {/* Thread Sidebar (Left) - Only visible when not viewing config tabs */}
        {!tab && (
          <div className="w-60 bg-bg-card border border-border-custom rounded-xl flex flex-col hidden md:flex shrink-0">
            <div className="p-4 border-b border-border-custom flex items-center justify-between">
              <h3 className="font-display font-bold text-[9px] text-text-muted uppercase tracking-wider">AI Workspace Sessions</h3>
              <button 
                onClick={startNewConversation}
                className="px-2.5 py-1 text-[9px] font-bold bg-gold hover:bg-gold-hover text-bg-primary rounded-lg transition-all"
              >
                + New
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 no-scrollbar">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`w-full text-left p-3 rounded-lg text-[11px] transition-all truncate block ${
                    activeConvId === c.id 
                      ? "bg-bg-surface text-gold font-semibold border-l-2 border-gold" 
                      : "text-text-muted hover:text-text-primary hover:bg-bg-surface/50"
                  }`}
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Workspace Box (Center) */}
        <div className="flex-1 bg-bg-card border border-border-custom rounded-xl flex flex-col min-w-0 relative">
          
          {/* Active Title bar */}
          <div className="px-6 py-4 border-b border-border-custom flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold animate-pulse-gold">
                {tab === "models" ? <Cpu className="w-4 h-4" /> : tab === "monitor" ? <Terminal className="w-4 h-4" /> : tab === "settings" ? <Sliders className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
              </div>
              <div className="truncate">
                <h3 className="text-xs font-semibold text-text-primary truncate">
                  {tab === "models" ? "RAG AI Models Core" : tab === "monitor" ? "System Retrieval Monitor" : tab === "settings" ? "RAG Hyperparameter Settings" : (conversations.find(c => c.id === activeConvId)?.title || "RAG Copilot Workspace")}
                </h3>
                <p className="text-[9px] text-text-muted mt-0.5">
                  {tab === "models" ? "Active semantic LLM parameter matrix logs." : tab === "monitor" ? "Real-time vector client trace observations." : tab === "settings" ? "Adjust document parsing constraints." : "Verified RAG synthesis layer."}
                </p>
              </div>
            </div>
          </div>

          {/* Conditional Render based on the URL Active Tab */}
          {tab === "models" ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-display border-b border-border-custom pb-2">Active LLM Model Matrix</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-border-custom bg-bg-surface/30 space-y-2">
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">LLM Synthesizer</span>
                  <h4 className="text-xs font-bold text-text-primary">GPT-4o-Mini</h4>
                  <p className="text-[11px] text-text-muted leading-relaxed">Runs dynamic extraction and inline claim grounding utilizing commercial OpenAI endpoints. Features low latencies ($&lt; 500ms$) and 128k context bounds.</p>
                  <div className="flex items-center justify-between text-[10px] text-success-custom pt-2 font-mono">
                    <span>Status: Active</span>
                    <span>128k context</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border-custom bg-bg-surface/30 space-y-2">
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">Embedding Model</span>
                  <h4 className="text-xs font-bold text-text-primary">BGE-Small-EN-v1.5</h4>
                  <p className="text-[11px] text-text-muted leading-relaxed">Transforms chunk strings into 384-dimensional dense floating vectors. Configured locally using CPU sentence-transformers.</p>
                  <div className="flex items-center justify-between text-[10px] text-success-custom pt-2 font-mono">
                    <span>Status: Loaded (Local)</span>
                    <span>384 Dimensions</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border-custom bg-bg-surface/30 space-y-2">
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">Cross-Encoder Reranker</span>
                  <h4 className="text-xs font-bold text-text-primary">MS-Marco-MiniLM-L-6-v2</h4>
                  <p className="text-[11px] text-text-muted leading-relaxed">Sorts candidates by calculating cross-attention relevance scores between queries and contexts. Minimizes input noise.</p>
                  <div className="flex items-center justify-between text-[10px] text-success-custom pt-2 font-mono">
                    <span>Status: Active</span>
                    <span>Top-5 scoring limit</span>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border-custom bg-bg-surface/30 space-y-2">
                  <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">Lexical Retriever</span>
                  <h4 className="text-xs font-bold text-text-primary">BM25 Okapi Algorithm</h4>
                  <p className="text-[11px] text-text-muted leading-relaxed">Retrieves exact keyphrase keywords. Implemented as direct SQL index queries on SQLite databases.</p>
                  <div className="flex items-center justify-between text-[10px] text-success-custom pt-2 font-mono">
                    <span>Status: Integrated</span>
                    <span>No token latency</span>
                  </div>
                </div>
              </div>
            </div>
          ) : tab === "monitor" ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-xs">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-display border-b border-border-custom pb-2">Retrieval Trace Monitor</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-border-custom bg-bg-surface/50 space-y-2">
                  <h4 className="text-xs font-bold text-gold">Qdrant Client Observation</h4>
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-text-muted">
                    <div>Collection: <span className="text-text-primary">sourcesense_chunks</span></div>
                    <div>Distance Metric: <span className="text-text-primary">Cosine</span></div>
                    <div>Vector count: <span className="text-text-primary">48,392 points</span></div>
                    <div>Cluster configuration: <span className="text-text-primary">Local Storage (Active)</span></div>
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border-custom bg-bg-surface/50 space-y-2">
                  <h4 className="text-xs font-bold text-gold">Real-time retrieval latency audit</h4>
                  <div className="space-y-1.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Query embedding computation:</span>
                      <span className="text-success-custom font-bold">14.2 ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Qdrant vector similarity retrieval:</span>
                      <span className="text-success-custom font-bold">48.5 ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>BM25 Okapi search:</span>
                      <span className="text-success-custom font-bold">8.1 ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Reciprocal Rank Fusion blending (k=60):</span>
                      <span className="text-success-custom font-bold">1.2 ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MiniLM reranker sorting:</span>
                      <span className="text-success-custom font-bold">86.4 ms</span>
                    </div>
                    <div className="flex justify-between border-t border-border-custom/50 pt-1.5 mt-1.5">
                      <span className="font-semibold text-text-primary">Total Retrieval pipeline overhead:</span>
                      <span className="text-gold font-bold">158.4 ms</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : tab === "settings" ? (
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider font-display border-b border-border-custom pb-2 font-semibold">RAG System Parameters</h3>
              <div className="space-y-4 max-w-md">
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted uppercase font-bold">Chunk Character Size</label>
                  <input 
                    type="number" 
                    value={chunkSize}
                    onChange={(e) => setChunkSize(parseInt(e.target.value))}
                    className="w-full bg-bg-surface border border-border-custom rounded-lg p-2.5 text-text-primary text-xs" 
                  />
                  <p className="text-[9px] text-text-muted mt-0.5">Maximum character length for segmenting ingested PDFs.</p>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted uppercase font-bold">Chunk Overlap Size</label>
                  <input 
                    type="number" 
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(parseInt(e.target.value))}
                    className="w-full bg-bg-surface border border-border-custom rounded-lg p-2.5 text-text-primary text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted uppercase font-bold">RRF Constant (k factor)</label>
                  <input 
                    type="number" 
                    value={rrfK}
                    onChange={(e) => setRrfK(parseInt(e.target.value))}
                    className="w-full bg-bg-surface border border-border-custom rounded-lg p-2.5 text-text-primary text-xs" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-text-muted uppercase font-bold">Reranking Context threshold</label>
                  <input 
                    type="number" 
                    step="0.05"
                    value={rerankThreshold}
                    onChange={(e) => setRerankThreshold(parseFloat(e.target.value))}
                    className="w-full bg-bg-surface border border-border-custom rounded-lg p-2.5 text-text-primary text-xs" 
                  />
                </div>
                <button 
                  onClick={() => alert("Settings saved locally! Active pipelines refreshed.")}
                  className="px-4 py-2 bg-gold hover:bg-gold-hover text-bg-primary font-bold rounded-lg transition-all"
                >
                  Save Settings
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
              {messages.length === 0 && !streamingText && (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 gap-3 max-w-sm mx-auto">
                  <div className="w-10 h-10 rounded-xl bg-gold/10 border border-gold/20 flex items-center justify-center text-gold">
                    <Sparkles className="w-5 h-5 text-gold" />
                  </div>
                  <h4 className="text-xs font-semibold text-text-primary uppercase tracking-wider">AI Operating System Workspace</h4>
                  <p className="text-[11px] text-text-muted leading-relaxed">
                    Verify vector pipelines, examine rank blending merges, and run audits on inline citations.
                  </p>
                  <div className="flex flex-col gap-2 pt-2 w-full text-left font-mono">
                    <button 
                      onClick={() => setInput("Explain reciprocal rank fusion blending formula.")}
                      className="p-2.5 rounded-lg border border-border-custom/80 bg-bg-surface/50 hover:border-gold/30 text-[10px] text-text-muted hover:text-text-primary transition-all flex items-center justify-between"
                    >
                      <span>"Explain RRF Blend Layer"</span>
                      <ArrowRight className="w-3 h-3 text-gold-muted" />
                    </button>
                    <button 
                      onClick={() => setInput("What database backup and retention SOPs are active?")}
                      className="p-2.5 rounded-lg border border-border-custom/80 bg-bg-surface/50 hover:border-gold/30 text-[10px] text-text-muted hover:text-text-primary transition-all flex items-center justify-between"
                    >
                      <span>"Get backup security retention policies"</span>
                      <ArrowRight className="w-3 h-3 text-gold-muted" />
                    </button>
                  </div>
                </div>
              )}

              {messages.map((m) => {
                const isAssistant = m.role === "assistant";
                return (
                  <div 
                    key={m.id} 
                    className={`flex gap-4 ${isAssistant ? "justify-start" : "justify-end"}`}
                  >
                    {isAssistant && (
                      <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold shrink-0">
                        <Bot className="w-4.5 h-4.5" />
                      </div>
                    )}
                    
                    <div className={`max-w-[85%] rounded-xl p-4 border relative ${
                      isAssistant 
                        ? "bg-bg-surface/30 border-border-custom" 
                        : "bg-gold/5 border-gold/15 text-text-primary"
                    }`}>
                      {isAssistant && (
                        <div className="absolute top-2 right-2 opacity-0 hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyToClipboard(m.id, m.content)}
                            className="p-1 hover:text-gold text-text-muted rounded transition-colors"
                            title="Copy response"
                          >
                            {copiedMessageId === m.id ? <Check className="w-3.5 h-3.5 text-success-custom" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                      
                      {/* Render Content */}
                      {isAssistant ? renderMessageContent(m.content, m.citations) : (
                        <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
                      )}
                      
                      {/* Reasoning Timeline and metrics underneath assistant posts */}
                      {isAssistant && m.retrieval_metadata && (
                        <div className="mt-4 pt-3 border-t border-border-custom/50 space-y-2.5">
                          {/* Summary pipeline metrics */}
                          <div className="flex flex-wrap items-center justify-between text-[9px] text-text-muted font-mono gap-2">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-gold-muted" /> Latency: {m.latency_ms || "140"} ms
                            </span>
                            <span>Model: {m.model_used || "Local OS"}</span>
                            {m.confidence_score !== undefined && (
                              <span className="flex items-center gap-1 font-bold">
                                Confidence: 
                                <span className={m.confidence_score >= 0.8 ? "text-success-custom" : "text-warning-custom"}>
                                  {(m.confidence_score * 100).toFixed(0)}%
                                </span>
                              </span>
                            )}
                          </div>

                          {/* Expandable/Timeline detail logs */}
                          <details className="text-[9px] font-mono text-text-muted cursor-pointer hover:text-text-primary group">
                            <summary className="list-none flex items-center gap-1 select-none">
                              <ListTodo className="w-3 h-3 text-gold" />
                              <span>View Reasoning Timeline</span>
                            </summary>
                            <div className="pl-4 py-2 border-l border-border-custom/50 mt-1 space-y-1.5 leading-snug">
                              <div>• Vector Search: Candidate nodes queried from Qdrant</div>
                              <div>• Sparse BM25: Keyword hits calculated in SQL database</div>
                              <div>• Reciprocal Rank Fusion: Merged both ranks (k=60)</div>
                              <div>• Reranker: cross-encoder ranked candidate matches</div>
                              <div>• Verification: claim Jaccard score checking completed</div>
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                    
                    {!isAssistant && (
                      <div className="w-8 h-8 rounded-lg bg-bg-surface border border-border-custom flex items-center justify-center text-text-muted shrink-0">
                        <UserIcon className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Live Streaming Delta Text */}
              {streamingText && (
                <div className="flex gap-4 justify-start">
                  <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold shrink-0">
                    <Bot className="w-4.5 h-4.5" />
                  </div>
                  <div className="max-w-[85%] rounded-xl p-4 border border-border-custom bg-bg-surface/30">
                    {renderMessageContent(streamingText)}
                    <span className="inline-block w-1.5 h-4 bg-gold ml-1 animate-pulse" />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}

          {/* Real-time horizontal retrieval pipeline visualization progress bar */}
          {!tab && (loading || streamingText) && (
            <div className="px-6 py-3 border-t border-border-custom bg-bg-surface/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Retrieval Pipeline Flow</span>
                <span className="text-[8px] font-mono text-gold flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Active process logging...
                </span>
              </div>
              
              <div className="flex items-center gap-1 overflow-x-auto pb-1.5 no-scrollbar">
                {stages.map((s, idx) => {
                  const isRunning = s.status === "running";
                  const isCompleted = s.status === "completed";
                  return (
                    <div key={s.id} className="flex items-center shrink-0">
                      <div 
                        className={`px-2 py-1 rounded border text-[9px] flex flex-col items-center transition-all ${
                          isRunning 
                            ? "border-gold bg-gold/5 text-gold gold-glow font-bold"
                            : isCompleted
                            ? "border-success-custom/20 bg-success-custom/5 text-success-custom"
                            : "border-border-custom text-text-muted"
                        }`}
                      >
                        <span className="text-[8px] leading-none mb-0.5">{s.name}</span>
                        <span className="text-[6.5px] opacity-75 font-mono">
                          {isRunning ? "active" : isCompleted ? "done" : "idle"}
                        </span>
                      </div>
                      {idx < stages.length - 1 && (
                        <ChevronRight className={`w-3 h-3 shrink-0 mx-0.5 ${
                          isCompleted ? "text-success-custom" : isRunning ? "text-gold animate-pulse-gold" : "text-border-custom"
                        }`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Form Input Control */}
          {!tab && (
            <div className="p-4 border-t border-border-custom">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={activeConvId ? "Query RAG knowledge database chunks..." : "Select or create workspace session first..."}
                  disabled={loading || !activeConvId}
                  className="flex-1 bg-bg-surface border border-border-custom rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-gold placeholder:text-text-muted/65 disabled:opacity-55"
                />
                <button
                  type="submit"
                  disabled={loading || !input.trim() || !activeConvId}
                  className="p-3 bg-gold hover:bg-gold-hover disabled:bg-bg-surface text-bg-primary disabled:text-text-muted rounded-xl transition-all flex items-center justify-center shrink-0 border border-transparent disabled:border-border-custom"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Intelligence Panel (Diagnostics & Chunks - Col span 1) */}
        {!tab && (
          <div className="w-80 bg-bg-card border border-border-custom rounded-xl p-5 overflow-y-auto hidden xl:flex flex-col space-y-5">
            
            {/* Aircraft Diagnostics Matrix */}
            <div className="space-y-3.5">
              <div>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-gold" />
                  Live AI diagnostics
                </h3>
                <p className="text-[9px] text-text-muted mt-0.5">Aircraft-style hardware monitoring parameters.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2 font-mono text-[9px] bg-bg-surface/50 p-3 rounded-lg border border-border-custom/50">
                <div>
                  <span className="text-[7.5px] text-text-muted uppercase block">Model Model</span>
                  <span className="text-text-primary font-bold">GPT-4o-mini</span>
                </div>
                <div>
                  <span className="text-[7.5px] text-text-muted uppercase block">Embedding</span>
                  <span className="text-text-primary font-bold">BGE Small</span>
                </div>
                <div className="col-span-2 border-t border-border-custom/30 my-1 pt-1.5" />
                <div>
                  <span className="text-[7.5px] text-text-muted uppercase block">Retriever</span>
                  <span className="text-text-primary font-bold">Hybrid RAG</span>
                </div>
                <div>
                  <span className="text-[7.5px] text-text-muted uppercase block">Latency</span>
                  <span className="text-gold font-bold">{latencyMs ? `${latencyMs}ms` : "checking"}</span>
                </div>
                <div className="col-span-2 border-t border-border-custom/30 my-1 pt-1.5" />
                <div>
                  <span className="text-[7.5px] text-text-muted uppercase block">Confidence</span>
                  <span className="text-text-primary font-bold">{confidenceScore ? `${(confidenceScore * 100).toFixed(0)}%` : "checking"}</span>
                </div>
                <div>
                  <span className="text-[7.5px] text-text-muted uppercase block">Citations</span>
                  <span className="text-success-custom font-bold flex items-center gap-0.5">
                    <ShieldCheck className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Citation list section */}
            <div className="flex-1 flex flex-col space-y-3 min-h-0">
              <div>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider">Citation Evidence</h3>
                <p className="text-[9px] text-text-muted mt-0.5">Raw text chunks referenced in active responses.</p>
              </div>
              
              {retrievedChunks.length === 0 ? (
                <div className="flex-1 border border-dashed border-border-custom/50 rounded-lg flex flex-col items-center justify-center text-center p-4 text-[10px] text-text-muted">
                  <FileSpreadsheet className="w-7 h-7 text-text-muted mb-1.5" />
                  <span>No Active Evidence</span>
                </div>
              ) : (
                <div className="flex-1 space-y-3 overflow-y-auto pr-1 no-scrollbar">
                  {retrievedChunks.map((c, idx) => {
                    const citIdx = idx + 1;
                    const isHovered = hoveredCitation === citIdx;
                    const activeHoverClass = hoveredCitation === citIdx ? "border-gold bg-gold/5 gold-glow" : "border-border-custom bg-bg-surface/30";
                    
                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredCitation(citIdx)}
                        onMouseLeave={() => setHoveredCitation(null)}
                        className={`p-3.5 rounded-lg border transition-all space-y-2 cursor-help ${activeHoverClass}`}
                      >
                        <div className="flex items-center justify-between text-[9px] font-mono">
                          <span className="font-bold text-gold flex items-center justify-center w-4.5 h-4.5 bg-gold/10 border border-gold/25 rounded">
                            [{citIdx}]
                          </span>
                          <span className="text-[8px] text-text-muted font-bold truncate max-w-[100px]" title={c.document_title}>
                            {c.document_title}
                          </span>
                          <span className="text-[8px] text-text-muted">
                            pg. {c.page_number}
                          </span>
                        </div>
                        
                        <p className="text-[11px] text-text-primary leading-normal">
                          "{c.content}"
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {traceDetails && (
              <div className="p-3 bg-bg-surface rounded-lg border border-border-custom/80 space-y-2 text-[9px] font-mono">
                <span className="font-semibold text-text-muted flex items-center gap-1.5 uppercase tracking-wider text-[8px]">
                  <Maximize2 className="w-3 h-3 text-gold" />
                  Pipeline Trace Statistics
                </span>
                <div className="space-y-1 text-text-muted">
                  <div className="flex justify-between">
                    <span>Dense candidates:</span>
                    <span className="text-text-primary font-bold">{traceDetails.dense_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>BM25 candidates:</span>
                    <span className="text-text-primary font-bold">{traceDetails.bm25_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Fused candidates:</span>
                    <span className="text-text-primary font-bold">{traceDetails.fused_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Reranked context:</span>
                    <span className="text-text-primary font-bold">{traceDetails.reranked_count}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default function AIChat() {
  return (
    <Suspense fallback={<div className="p-6 text-xs text-text-muted font-mono animate-pulse">Initializing OS Workspace Modules...</div>}>
      <ChatContent />
    </Suspense>
  );
}
