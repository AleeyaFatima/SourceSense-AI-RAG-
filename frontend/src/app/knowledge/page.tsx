"use client";

import { useEffect, useState } from "react";
import { 
  Upload, 
  FileText, 
  Grid, 
  List as ListIcon, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Trash2,
  BookOpen
} from "lucide-react";
import { 
  ResponsiveContainer, 
  ScatterChart, 
  Scatter, 
  XAxis, 
  YAxis, 
  ZAxis, 
  Tooltip as RechartsTooltip,
  Cell
} from "recharts";

import DashboardLayout from "@/components/DashboardLayout";

const colors = ["#D4AF37", "#F7C948", "#C59B27", "#8C6A1D", "#A57C1B", "#E5C158"];

// Demo/Fallback Data
const MOCK_DOCUMENTS = [
  { id: 1, title: "SourceSense-RAG-Framework-Architecture", file_type: "pdf", page_count: 8, chunk_count: 36, status: "ready", created_at: new Date(Date.now() - 1000*3600*24).toISOString() },
  { id: 2, title: "Company-Access-Control-Policy", file_type: "docx", page_count: 3, chunk_count: 14, status: "ready", created_at: new Date(Date.now() - 1000*3600*48).toISOString() },
  { id: 3, title: "SLA-Customer-Agreement-2026", file_type: "txt", page_count: 15, chunk_count: 65, status: "ready", created_at: new Date(Date.now() - 1000*3600*12).toISOString() },
  { id: 4, title: "System-Recovery-Guidelines", file_type: "md", page_count: 2, chunk_count: 0, status: "processing", created_at: new Date().toISOString() }
];

const getMockChunks = (docId: number) => {
  const chunks: any[] = [];
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
      chunk_index: i,
      content: `This is chunk ${i} from document ${docId} describing key technical parameters of the system including details on ${topics[topicIdx]} protocol implementations.`,
      page_number: Math.floor(i / 4) + 1,
      section_heading: `${topics[topicIdx]} Details`,
      x_coord: centerX + randX,
      y_coord: centerY + randY
    });
  }
  return chunks;
};

export default function KnowledgeBase() {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  const [documents, setDocuments] = useState(MOCK_DOCUMENTS);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [chunks, setChunks] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [selectedChunk, setSelectedChunk] = useState<any>(null);

  const fetchDocuments = () => {
    setLoadingDocs(true);
    fetch(`${API_BASE}/api/documents/`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then((data) => {
        setDocuments(data);
        setIsDemoMode(false);
        setLoadingDocs(false);
        // If there was a selected document, refresh it
        if (selectedDoc) {
          const fresh = data.find((d: any) => d.id === selectedDoc.id);
          if (fresh) setSelectedDoc(fresh);
        }
      })
      .catch(() => {
        setDocuments(MOCK_DOCUMENTS);
        setIsDemoMode(true);
        setLoadingDocs(false);
      });
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (!selectedDoc) {
      setChunks([]);
      setSelectedChunk(null);
      return;
    }
    
    if (isDemoMode) {
      setChunks(getMockChunks(selectedDoc.id));
      return;
    }
    
    fetch(`${API_BASE}/api/documents/${selectedDoc.id}/chunks`)
      .then(res => res.json())
      .then(data => {
        setChunks(data);
      })
      .catch(() => {
        setChunks(getMockChunks(selectedDoc.id));
      });
  }, [selectedDoc, isDemoMode]);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const uploadFile = (file: File) => {
    const fileExt = file.name.split(".").pop()?.toLowerCase();
    if (!fileExt || !["pdf", "docx", "txt", "md"].includes(fileExt)) {
      setUploadError("Invalid file type. Please upload a PDF, DOCX, TXT, or MD file.");
      return;
    }
    
    setUploadError("");
    setUploading(true);
    
    if (isDemoMode) {
      // Simulate local upload in demo mode
      setTimeout(() => {
        const newDoc = {
          id: Date.now(),
          title: file.name.split(".")[0],
          file_type: fileExt,
          page_count: Math.floor(Math.random() * 5) + 1,
          chunk_count: Math.floor(Math.random() * 20) + 10,
          status: "ready",
          created_at: new Date().toISOString()
        };
        setDocuments(prev => [newDoc, ...prev]);
        setUploading(false);
      }, 1500);
      return;
    }
    
    const formData = new FormData();
    formData.append("file", file);
    
    fetch(`${API_BASE}/api/documents/upload`, {
      method: "POST",
      body: formData
    })
      .then(res => {
        if (!res.ok) return res.json().then(e => { throw new Error(e.detail); });
        return res.json();
      })
      .then(() => {
        fetchDocuments();
        setUploading(false);
      })
      .catch(err => {
        setUploadError(err.message || "Failed to upload file.");
        setUploading(false);
      });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      uploadFile(e.target.files[0]);
    }
  };

  const handleDelete = (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedDoc?.id === docId) setSelectedDoc(null);
    
    if (isDemoMode) {
      setDocuments(prev => prev.filter(d => d.id !== docId));
      return;
    }
    
    fetch(`${API_BASE}/api/documents/${docId}`, {
      method: "DELETE"
    })
      .then(() => fetchDocuments())
      .catch(() => {
        setDocuments(prev => prev.filter(d => d.id !== docId));
      });
  };

  // Pre-configured colors for scatter plot cluster points based on page number
  const colors = ["#D4AF37", "#4ADE80", "#60A5FA", "#F87171", "#A78BFA", "#FBBF24"];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-3xl tracking-tight text-text-primary">Knowledge Base</h2>
            <p className="text-text-muted mt-1 text-sm">Add enterprise resources and visualize their distribution in vector embedding space.</p>
          </div>
          <div className="flex items-center gap-3">
            {isDemoMode && (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-warning-custom/30 bg-warning-custom/10 text-xs text-warning-custom font-medium animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Demo Mode
              </span>
            )}
            <button 
              onClick={fetchDocuments}
              className="p-2 rounded-lg border border-border-custom bg-bg-card hover:bg-bg-surface hover:text-gold transition-all"
              title="Refresh Documents"
            >
              <RefreshCw className="w-3.5 h-3.5 text-text-muted" />
            </button>
            <div className="flex border border-border-custom rounded-lg overflow-hidden bg-bg-card">
              <button 
                onClick={() => setViewMode("grid")}
                className={`p-2 transition-colors ${viewMode === "grid" ? "bg-bg-surface text-gold" : "text-text-muted hover:text-text-primary"}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setViewMode("list")}
                className={`p-2 transition-colors ${viewMode === "list" ? "bg-bg-surface text-gold" : "text-text-muted hover:text-text-primary"}`}
              >
                <ListIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Dashboard Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          
          {/* Document Section (Left/Two-thirds) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Upload Zone */}
            <div 
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              className={`p-8 rounded-xl border-2 border-dashed text-center transition-all ${
                dragActive 
                  ? "border-gold bg-gold/5" 
                  : "border-border-custom bg-bg-card hover:border-gold-muted/40"
              }`}
            >
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                onChange={handleFileChange}
                accept=".pdf,.docx,.txt,.md"
              />
              <label 
                htmlFor="file-upload" 
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-bg-surface border border-border-custom flex items-center justify-center text-text-muted">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-gold" />
                  ) : (
                    <Upload className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">
                    {uploading ? "Ingesting document..." : "Drag & Drop or Click to Upload"}
                  </p>
                  <p className="text-xs text-text-muted mt-1">Supports PDF, DOCX, TXT, and MD (Max 20MB)</p>
                </div>
              </label>
              {uploadError && (
                <div className="mt-4 flex items-center gap-1.5 justify-center text-xs text-error-custom font-medium">
                  <AlertTriangle className="w-4 h-4" />
                  {uploadError}
                </div>
              )}
            </div>

            {/* Document Listing */}
            {loadingDocs ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-32 rounded-xl bg-bg-card border border-border-custom animate-pulse" />
                ))}
              </div>
            ) : documents.length === 0 ? (
              <div className="p-12 text-center rounded-xl bg-bg-card border border-border-custom flex flex-col items-center gap-4">
                <FileText className="w-12 h-12 text-text-muted" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">No Documents Indexed</p>
                  <p className="text-xs text-text-muted mt-1">Upload files to populate the knowledge base and start questioning.</p>
                </div>
              </div>
            ) : viewMode === "grid" ? (
              /* Grid View */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => doc.status === "ready" && setSelectedDoc(doc)}
                    className={`p-5 rounded-xl border transition-all flex flex-col justify-between h-36 ${
                      doc.status === "ready" ? "cursor-pointer bg-bg-card hover:bg-bg-surface" : "bg-bg-card/40 opacity-70"
                    } ${selectedDoc?.id === doc.id ? "border-gold gold-glow" : "border-border-custom"}`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded bg-bg-surface border border-border-custom flex items-center justify-center text-gold-muted">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <h4 className="text-xs font-semibold text-text-primary truncate" title={doc.title}>
                            {doc.title}
                          </h4>
                          <span className="text-[10px] text-text-muted uppercase font-mono">{doc.file_type}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        className="p-1 text-text-muted hover:text-error-custom transition-colors rounded hover:bg-bg-surface"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-4 border-t border-border-custom/50">
                      <div className="flex items-center gap-3 font-mono text-[10px] text-text-muted">
                        <span>{doc.page_count} pgs</span>
                        <span>•</span>
                        <span>{doc.chunk_count} chunks</span>
                      </div>
                      <span className="flex items-center gap-1">
                        {doc.status === "ready" ? (
                          <>
                            <CheckCircle className="w-3.5 h-3.5 text-success-custom" />
                            <span className="text-[10px] text-success-custom font-semibold">Indexed</span>
                          </>
                        ) : doc.status === "processing" ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 text-gold animate-spin" />
                            <span className="text-[10px] text-gold font-semibold">Processing</span>
                          </>
                        ) : (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-error-custom" />
                            <span className="text-[10px] text-error-custom font-semibold">Failed</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="rounded-xl border border-border-custom bg-bg-card overflow-hidden">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-bg-surface border-b border-border-custom text-text-muted font-semibold">
                      <th className="p-4">Name</th>
                      <th className="p-4">Type</th>
                      <th className="p-4">Pages</th>
                      <th className="p-4">Chunks</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-custom/50">
                    {documents.map((doc) => (
                      <tr 
                        key={doc.id}
                        onClick={() => doc.status === "ready" && setSelectedDoc(doc)}
                        className={`hover:bg-bg-surface/40 transition-colors ${
                          doc.status === "ready" ? "cursor-pointer" : "opacity-60"
                        } ${selectedDoc?.id === doc.id ? "bg-gold/5" : ""}`}
                      >
                        <td className="p-4 font-semibold text-text-primary flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-gold-muted" />
                          <span className="truncate max-w-[200px]" title={doc.title}>{doc.title}</span>
                        </td>
                        <td className="p-4 uppercase font-mono text-text-muted text-[10px]">{doc.file_type}</td>
                        <td className="p-4 font-mono">{doc.page_count}</td>
                        <td className="p-4 font-mono">{doc.chunk_count}</td>
                        <td className="p-4">
                          <span className="flex items-center gap-1">
                            {doc.status === "ready" ? (
                              <CheckCircle className="w-3.5 h-3.5 text-success-custom" />
                            ) : doc.status === "processing" ? (
                              <Loader2 className="w-3.5 h-3.5 text-gold animate-spin" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 text-error-custom" />
                            )}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={(e) => handleDelete(doc.id, e)}
                            className="p-1 text-text-muted hover:text-error-custom rounded hover:bg-bg-surface"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Dimensionality Reduction Scatter Plot (Right/One-third) */}
          <div className="p-6 rounded-xl bg-bg-card border border-border-custom space-y-6">
            <div>
              <h3 className="font-display font-bold text-lg text-text-primary">Embedding Projection</h3>
              <p className="text-xs text-text-muted mt-0.5">2D scatter map of document vector chunks (PCA Projection).</p>
            </div>
            
            {!selectedDoc ? (
              <div className="h-64 rounded-lg bg-bg-surface/50 border border-border-custom/50 border-dashed flex flex-col items-center justify-center text-center p-6 gap-2">
                <BookOpen className="w-8 h-8 text-text-muted" />
                <span className="text-xs font-semibold text-text-primary">No Document Selected</span>
                <span className="text-[10px] text-text-muted leading-relaxed">Select an indexed document card to view its semantic spatial mapping.</span>
              </div>
            ) : chunks.length === 0 ? (
              <div className="h-64 rounded-lg bg-bg-surface flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Recharts Scatter Plot */}
                <div className="h-60 w-full bg-bg-surface rounded-lg p-2 border border-border-custom/50">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
                      <XAxis type="number" dataKey="x_coord" name="x" stroke="#737373" fontSize={8} hide />
                      <YAxis type="number" dataKey="y_coord" name="y" stroke="#737373" fontSize={8} hide />
                      <ZAxis type="number" range={[50, 80]} />
                      <RechartsTooltip 
                        cursor={{ strokeDasharray: '3 3' }} 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-bg-card border border-border-custom p-3 rounded-lg max-w-[200px] text-left shadow-xl">
                                <p className="text-[10px] font-semibold text-gold font-display mb-1">
                                  Chunk #{data.chunk_index} (Page {data.page_number})
                                </p>
                                <p className="text-[9px] text-text-primary line-clamp-3 leading-relaxed">
                                  {data.content}
                                </p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Scatter name="Chunks" data={chunks} onClick={(item) => setSelectedChunk(item.payload)}>
                        {chunks.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={colors[entry.page_number % colors.length]} 
                            className="cursor-pointer hover:stroke-gold hover:stroke-2"
                          />
                        ))}
                      </Scatter>
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Chunk Detail Card */}
                <div className="p-4 rounded-lg border border-border-custom bg-bg-surface space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono text-text-muted">
                    <span>
                      {selectedChunk ? `Chunk Index: ${selectedChunk.chunk_index}` : "Interactive Map Tips"}
                    </span>
                    <span>
                      {selectedChunk ? `Page: ${selectedChunk.page_number}` : `Total Chunks: ${chunks.length}`}
                    </span>
                  </div>
                  <p className="text-xs text-text-primary leading-relaxed line-clamp-4">
                    {selectedChunk 
                      ? selectedChunk.content 
                      : "Hover over the cluster points to preview the text. Click on a point to lock it in this review panel."}
                  </p>
                  {selectedChunk && selectedChunk.section_heading && (
                    <div className="pt-1.5 border-t border-border-custom/50">
                      <span className="text-[9px] font-semibold text-gold font-display uppercase tracking-wider">
                        Section: {selectedChunk.section_heading}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
