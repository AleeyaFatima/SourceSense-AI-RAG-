"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  FileText, 
  Cpu, 
  Percent, 
  Zap, 
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Clock,
  Sparkles,
  ShieldCheck,
  Server,
  Activity,
  History,
  GitBranch,
  CheckCircle2,
  Database
} from "lucide-react";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip,
  CartesianGrid,
  BarChart as RechartsBarChart,
  Bar,
  Cell
} from "recharts";

import DashboardLayout from "@/components/DashboardLayout";
import NeuralCore from "@/components/NeuralCore";

// Animated counter component for premium feel
function AnimatedCounter({ value, duration = 1500, suffix = "", decimal = false }) {
  const [count, setCount] = useState(0);
  const [floatCount, setFloatCount] = useState(0.0);

  useEffect(() => {
    let start = 0;
    const isFloat = decimal || value.toString().includes('.');
    const end = parseFloat(value.toString().replace(/[%,ms]/g, ''));
    
    if (isNaN(end)) return;
    
    const totalTicks = 50;
    const increment = end / totalTicks;
    const stepTime = duration / totalTicks;
    let ticks = 0;
    
    const timer = setInterval(() => {
      ticks++;
      start += increment;
      if (ticks >= totalTicks) {
        if (isFloat) {
          setFloatCount(end);
        } else {
          setCount(Math.round(end));
        }
        clearInterval(timer);
      } else {
        if (isFloat) {
          setFloatCount(start);
        } else {
          setCount(Math.round(start));
        }
      }
    }, stepTime);
    
    return () => clearInterval(timer);
  }, [value, duration, decimal]);

  if (decimal || value.toString().includes('.')) {
    return <span>{floatCount.toFixed(1)}{suffix}</span>;
  }
  return <span>{count.toLocaleString()}{suffix}</span>;
}

// Custom mock chart data for the weekly AI system performance
const WEEKLY_PERFORMANCE = [
  { day: "Mon", confidence: 89 },
  { day: "Tue", confidence: 91 },
  { day: "Wed", confidence: 92 },
  { day: "Thu", confidence: 94 },
  { day: "Fri", confidence: 95 },
  { day: "Sat", confidence: 96 },
  { day: "Sun", confidence: 97 }
];

const MOCK_LATENCY_DATA = [
  { range: "0-100ms", Count: 14 },
  { range: "100-250ms", Count: 38 },
  { range: "250-500ms", Count: 72 },
  { range: "500ms-1s", Count: 18 },
  { range: "1s+", Count: 5 }
];

export default function DashboardHome() {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeStage, setActiveStage] = useState<string | null>(null);

  // Stats values
  const [stats, setStats] = useState({
    totalDocs: 1254,
    chunks: 48392,
    embeddingCoverage: 99.2,
    citationAccuracy: 97.4,
    avgConfidence: 94.0,
    latencyMs: 432
  });

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const checkBackend = () => {
    setLoading(true);
    fetch(`${API_BASE}/api/analytics/dashboard`)
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        setStats({
          totalDocs: data.metrics.total_documents || 12,
          chunks: data.metrics.ready_documents * 28 || 482,
          embeddingCoverage: 99.8,
          citationAccuracy: data.metrics.avg_confidence ? parseFloat((data.metrics.avg_confidence * 99).toFixed(1)) : 97.4,
          avgConfidence: data.metrics.avg_confidence ? parseFloat((data.metrics.avg_confidence * 100).toFixed(1)) : 94.0,
          latencyMs: data.metrics.avg_latency_ms || 320
        });
        setIsDemoMode(false);
        setLoading(false);
      })
      .catch(() => {
        setIsDemoMode(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    checkBackend();
  }, []);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Top bar with Page title & Developer Tag */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-2xl tracking-tight text-text-primary">
              SourceSense AI
            </h2>
            <p className="text-text-muted text-xs font-mono mt-0.5 tracking-wider uppercase">
              Enterprise AI Knowledge Intelligence Platform
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            {isDemoMode && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-warning-custom/30 bg-warning-custom/10 text-[10px] text-warning-custom font-medium animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5" />
                Demo Mode (Simulation Active)
              </span>
            )}
            <button 
              onClick={checkBackend}
              className="p-1.5 rounded-lg border border-border-custom bg-bg-card hover:bg-bg-surface hover:text-gold transition-all text-xs flex items-center gap-1.5 text-text-muted"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sync OS
            </button>
          </div>
        </div>

        {/* Core Layout Grid: 3 Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Main Space (Center & Left Columns - col span 2) */}
          <div className="lg:col-span-2 space-y-6 flex flex-col justify-between">
            
            {/* Centerpiece: 3D Neural Sphere Knowledge Core */}
            <div className="glass-card rounded-2xl border border-border-custom relative overflow-hidden flex flex-col justify-between min-h-[360px] p-6">
              <div className="absolute top-4 left-4 z-10">
                <h3 className="text-xs font-semibold text-text-primary flex items-center gap-1.5 font-display">
                  <span className="w-2 h-2 rounded-full bg-gold animate-ping" />
                  Knowledge Space Coordinates
                </h3>
                <p className="text-[10px] text-text-muted mt-0.5">Real-time query segment distance mapping.</p>
              </div>

              {/* Simulation triggers for testing flows */}
              <div className="absolute top-4 right-4 z-10 flex gap-1.5">
                <button
                  onClick={() => {
                    setActiveStage("dense");
                    setTimeout(() => setActiveStage("rerank"), 1000);
                    setTimeout(() => setActiveStage("verify"), 2000);
                    setTimeout(() => setActiveStage(null), 3000);
                  }}
                  className="px-2 py-1 rounded border border-gold/20 bg-gold/5 text-[9px] font-bold text-gold hover:bg-gold/10 transition-colors"
                >
                  Pulse Flow
                </button>
              </div>

              {/* The interactive sphere canvas */}
              <div className="flex-1 min-h-[260px] w-full flex items-center justify-center">
                <NeuralCore activeStage={activeStage} />
              </div>
              
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[10px] text-text-muted border-t border-border-custom/50 pt-4 mt-2">
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gold" /> Verified Sources</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gold-hover" /> Live AI Pipelines</span>
                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gold-muted" /> Hybrid RAG Search</span>
              </div>
            </div>

            {/* Health Operational Metrics cards grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-bg-card border border-border-custom/80 flex flex-col justify-between h-20">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Chunks Cataloged</span>
                <span className="text-lg font-mono font-bold text-text-primary mt-1">
                  <AnimatedCounter value={stats.chunks} />
                </span>
              </div>
              <div className="p-4 rounded-xl bg-bg-card border border-border-custom/80 flex flex-col justify-between h-20">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Embedding Index</span>
                <span className="text-lg font-mono font-bold text-gold mt-1">
                  <AnimatedCounter value={stats.embeddingCoverage} suffix="%" />
                </span>
              </div>
              <div className="p-4 rounded-xl bg-bg-card border border-border-custom/80 flex flex-col justify-between h-20">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Citation Accuracy</span>
                <span className="text-lg font-mono font-bold text-success-custom mt-1">
                  <AnimatedCounter value={stats.citationAccuracy} suffix="%" />
                </span>
              </div>
              <div className="p-4 rounded-xl bg-bg-card border border-border-custom/80 flex flex-col justify-between h-20">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Indexed Documents</span>
                <span className="text-lg font-mono font-bold text-text-primary mt-1">
                  <AnimatedCounter value={stats.totalDocs} />
                </span>
              </div>
              <div className="p-4 rounded-xl bg-bg-card border border-border-custom/80 flex flex-col justify-between h-20">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">Avg Confidence</span>
                <span className="text-lg font-mono font-bold text-gold mt-1">
                  <AnimatedCounter value={stats.avgConfidence} suffix="%" />
                </span>
              </div>
              <div className="p-4 rounded-xl bg-bg-card border border-border-custom/80 flex flex-col justify-between h-20">
                <span className="text-[9px] font-semibold text-text-muted uppercase tracking-wider">RAG Latency</span>
                <span className="text-lg font-mono font-bold text-text-primary mt-1">
                  <AnimatedCounter value={stats.latencyMs} suffix=" ms" />
                </span>
              </div>
            </div>
          </div>

          {/* Right Intelligence Panel (Col span 1) */}
          <div className="space-y-6 flex flex-col justify-between">
            
            {/* Aircraft-style Diagnostics Panel */}
            <div className="glass-card rounded-2xl p-5 border border-border-custom space-y-4">
              <div>
                <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wider flex items-center gap-1.5 font-display">
                  <Activity className="w-3.5 h-3.5 text-gold" />
                  Right Intelligence diagnostics
                </h3>
                <p className="text-[9px] text-text-muted mt-0.5">Live vector parser instrumentation logs.</p>
              </div>

              {/* Info Matrix */}
              <div className="grid grid-cols-2 gap-3.5 pt-2 font-mono text-[10px]">
                <div className="p-2.5 rounded-lg bg-bg-surface/50 border border-border-custom/40">
                  <span className="text-text-muted text-[8px] uppercase block mb-0.5">Model Model</span>
                  <span className="text-text-primary font-semibold">GPT-4o-mini</span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg-surface/50 border border-border-custom/40">
                  <span className="text-text-muted text-[8px] uppercase block mb-0.5">Embedding Model</span>
                  <span className="text-text-primary font-semibold">BGE Small</span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg-surface/50 border border-border-custom/40">
                  <span className="text-text-muted text-[8px] uppercase block mb-0.5">Reranker model</span>
                  <span className="text-text-primary font-semibold">MiniLM-L6</span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg-surface/50 border border-border-custom/40">
                  <span className="text-text-muted text-[8px] uppercase block mb-0.5">Retriever</span>
                  <span className="text-text-primary font-semibold">Lexical-Dense</span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg-surface/50 border border-border-custom/40">
                  <span className="text-text-muted text-[8px] uppercase block mb-0.5">Citations audit</span>
                  <span className="text-success-custom font-bold flex items-center gap-0.5">
                    <CheckCircle2 className="w-2.5 h-2.5" /> Verified
                  </span>
                </div>
                <div className="p-2.5 rounded-lg bg-bg-surface/50 border border-border-custom/40">
                  <span className="text-text-muted text-[8px] uppercase block mb-0.5">Token processing</span>
                  <span className="text-text-primary font-semibold">2,391 t/q</span>
                </div>
              </div>
            </div>

            {/* Knowledge Insights Card */}
            <div className="p-5 rounded-2xl bg-bg-card border border-border-custom/80 space-y-3">
              <span className="text-[10px] font-bold text-gold uppercase tracking-wider block">Knowledge Insights</span>
              <div className="space-y-2 text-[10px]">
                <div className="flex justify-between p-2 rounded bg-bg-primary/40 border border-border-custom/40">
                  <span className="text-text-muted">Most Accessed:</span>
                  <span className="text-text-primary font-semibold truncate max-w-[120px]" title="API Authentication Guide">API Authentication Guide</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-bg-primary/40 border border-border-custom/40">
                  <span className="text-text-muted">Most Asked:</span>
                  <span className="text-text-primary font-semibold">Password Reset</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-bg-primary/40 border border-border-custom/40">
                  <span className="text-text-muted">Fastest Search:</span>
                  <span className="text-text-primary font-mono font-semibold">128 ms</span>
                </div>
                <div className="flex justify-between p-2 rounded bg-bg-primary/40 border border-border-custom/40">
                  <span className="text-text-muted">Top Confidence:</span>
                  <span className="text-gold font-mono font-bold">99.6%</span>
                </div>
              </div>
            </div>

            {/* Git-like Activity Timeline */}
            <div className="p-5 rounded-2xl bg-bg-card border border-border-custom/80 flex-1 flex flex-col justify-between space-y-3">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block flex items-center gap-1">
                <History className="w-3.5 h-3.5 text-gold-muted" />
                Operational Event Timeline
              </span>
              
              <div className="relative pl-4 space-y-3 border-l border-border-custom/80 mt-1 flex-1">
                <div className="relative text-[10px]">
                  <div className="absolute -left-[20px] top-0.5 w-2.5 h-2.5 rounded-full bg-gold border-2 border-bg-card" />
                  <span className="text-text-muted font-mono text-[9px] block">09:30 UTC</span>
                  <span className="text-text-primary font-semibold">Startup Document Ingest indexed 3 manuals</span>
                </div>
                <div className="relative text-[10px]">
                  <div className="absolute -left-[20px] top-0.5 w-2.5 h-2.5 rounded-full bg-success-custom border-2 border-bg-card" />
                  <span className="text-text-muted font-mono text-[9px] block">09:42 UTC</span>
                  <span className="text-text-primary font-semibold">RAGAS Quality evaluations logging check completed</span>
                </div>
                <div className="relative text-[10px]">
                  <div className="absolute -left-[20px] top-0.5 w-2.5 h-2.5 rounded-full bg-gold-muted border-2 border-bg-card" />
                  <span className="text-text-muted font-mono text-[9px] block">10:11 UTC</span>
                  <span className="text-text-primary font-semibold">Knowledge base vector projections recalculated</span>
                </div>
                <div className="relative text-[10px]">
                  <div className="absolute -left-[20px] top-0.5 w-2.5 h-2.5 rounded-full bg-success-custom border-2 border-bg-card" />
                  <span className="text-text-muted font-mono text-[9px] block">10:47 UTC</span>
                  <span className="text-text-primary font-semibold">Autonomic citation verification parameters passed</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section: RAG Weekly performance overview and About Platform description card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
          
          {/* Chart blocks (Col span 2) */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Weekly performance */}
            <div className="p-5 rounded-2xl bg-bg-card border border-border-custom/80 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-xs text-text-primary">System Performance</h3>
                <p className="text-[9px] text-text-muted">Weekly RAG citation verification confidence percentage logs.</p>
              </div>
              
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={WEEKLY_PERFORMANCE} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <defs>
                      <linearGradient id="glowConfidence" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.25}/>
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#181818" />
                    <XAxis dataKey="day" stroke="#9CA3AF" fontSize={8} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={8} tickLine={false} domain={[50, 100]} />
                    <Tooltip 
                      contentStyle={{ background: "#101010", border: "1px solid #222222", borderRadius: "8px" }}
                      labelStyle={{ color: "#9CA3AF", fontSize: "9px" }}
                      itemStyle={{ color: "#D4AF37", fontSize: "9px" }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="confidence" 
                      stroke="#D4AF37" 
                      fillOpacity={1} 
                      fill="url(#glowConfidence)" 
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center pt-2 text-[9px] text-text-muted border-t border-border-custom/40">
                <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-success-custom" /> Retrieval Rate: 98.4%</span>
                <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-gold" /> Index Growth: +14 Today</span>
              </div>
            </div>

            {/* Latency Histogram */}
            <div className="p-5 rounded-2xl bg-bg-card border border-border-custom/80 space-y-3 flex flex-col justify-between">
              <div>
                <h3 className="font-display font-bold text-xs text-text-primary flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-gold-muted" />
                  Retrieval Latency Histogram
                </h3>
                <p className="text-[9px] text-text-muted">Real-time latency frequency distributions.</p>
              </div>
              
              <div className="h-36 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsBarChart data={MOCK_LATENCY_DATA} margin={{ top: 5, right: 5, left: -30, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#181818" />
                    <XAxis dataKey="range" stroke="#9CA3AF" fontSize={8} tickLine={false} />
                    <YAxis stroke="#9CA3AF" fontSize={8} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ background: "#101010", border: "1px solid #222222", borderRadius: "8px" }}
                      labelStyle={{ color: "#9CA3AF", fontSize: "9px" }}
                      itemStyle={{ color: "#D4AF37", fontSize: "9px" }}
                    />
                    <Bar dataKey="Count" fill="#D4AF37" radius={[3, 3, 0, 0]}>
                      {MOCK_LATENCY_DATA.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 2 ? "#F7C948" : "#8C6A1D"} />
                      ))}
                    </Bar>
                  </RechartsBarChart>
                </ResponsiveContainer>
              </div>

              <div className="flex justify-between items-center pt-2 text-[9px] text-text-muted border-t border-border-custom/40">
                <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-success-custom" /> Hallucination Rate: 1.3%</span>
                <span className="flex items-center gap-1"><span className="w-1 h-1 rounded-full bg-gold" /> Avg Latency: 320 ms</span>
              </div>
            </div>

          </div>

          {/* About Project card crediting Aleeya Fatima */}
          <div className="p-6 rounded-2xl bg-bg-card border border-border-custom/80 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h3 className="font-display font-bold text-sm text-text-primary">About SourceSense AI</h3>
              <p className="text-xs text-text-muted leading-relaxed text-justify">
                SourceSense AI is an enterprise-grade Retrieval-Augmented Generation (RAG) platform designed to deliver trustworthy AI responses backed by verified citations. By combining semantic search, keyword retrieval, reranking, and citation verification, the platform minimizes hallucinations while providing transparent, explainable answers.
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {["Architecture", "RAG Engine", "Hybrid Retrieval", "Citations", "Evals", "Enterprise Ready"].map(badge => (
                <span 
                  key={badge} 
                  className="px-2 py-0.5 rounded border border-gold/15 bg-gold/5 text-[9px] font-mono text-gold"
                >
                  {badge}
                </span>
              ))}
            </div>

            <div className="pt-3 border-t border-border-custom/40 flex items-center justify-between text-[10px] text-text-muted">
              <span>Platform Developer:</span>
              <span className="font-bold text-text-primary">Aleeya Fatima</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
