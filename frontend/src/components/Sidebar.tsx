"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  MessageSquare, 
  Database, 
  FolderOpen,
  Cpu,
  LineChart,
  Activity,
  Search,
  Scroll,
  Settings,
  Server,
  UserCheck
} from "lucide-react";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [status, setStatus] = useState({
    api: "checking...",
    vector_db: "checking...",
    embedding_model: "checking..."
  });

  useEffect(() => {
    fetch("http://localhost:8000/api/analytics/dashboard")
      .then(res => res.json())
      .then(data => {
        if (data.system_status) {
          setStatus(data.system_status);
        }
      })
      .catch(() => {
        setStatus({
          api: "offline",
          vector_db: "offline",
          embedding_model: "inactive"
        });
      });
  }, [pathname]);

  const navItems = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "AI Workspace", href: "/chat", icon: MessageSquare },
    { name: "Knowledge Base", href: "/knowledge", icon: Database },
    { name: "Documents", href: "/knowledge?tab=docs", icon: FolderOpen },
    { name: "AI Models", href: "/chat?tab=models", icon: Cpu },
    { name: "Analytics", href: "/evaluation?tab=analytics", icon: LineChart },
    { name: "Evaluations", href: "/evaluation", icon: Activity },
    { name: "Retrieval Monitor", href: "/chat?tab=monitor", icon: Search },
    { name: "Audit Logs", href: "/evaluation?tab=audit", icon: Scroll },
    { name: "Settings", href: "/chat?tab=settings", icon: Settings },
  ];

  return (
    <aside className="w-full h-full flex flex-col">
      {/* Header / Logo */}
      <div className="p-6 border-b border-border-custom flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold flex items-center justify-center animate-pulse-gold">
          <span className="text-gold font-bold text-lg font-display">S</span>
        </div>
        <div>
          <h1 className="font-display font-bold text-text-primary text-sm tracking-wide">SourceSense AI</h1>
          <p className="text-[10px] text-gold-hover font-medium tracking-widest uppercase">Knowledge OS</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-0.5 overflow-y-auto no-scrollbar">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-xs font-medium transition-all group border border-transparent ${
                isActive
                  ? "bg-gold/5 text-gold border-gold/20 font-semibold shadow-[0_0_15px_rgba(212,175,55,0.05)]"
                  : "text-text-muted hover:text-gold hover:bg-bg-surface hover:border-gold/5"
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-300 group-hover:scale-110 ${
                isActive ? "text-gold" : "text-text-muted group-hover:text-gold-hover"
              }`} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* System Status Indicators */}
      <div className="p-4 mx-4 mb-4 rounded-xl bg-bg-surface border border-border-custom space-y-2.5">
        <h3 className="text-[9px] font-semibold text-text-muted uppercase tracking-wider flex items-center gap-1.5">
          <Server className="w-3.5 h-3.5 text-gold-muted" />
          Pipeline Status
        </h3>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-muted">API Endpoint</span>
            <span className="flex items-center gap-1">
              <span className={`w-1 h-1 rounded-full ${status.api === "healthy" ? "bg-success-custom animate-pulse" : "bg-error-custom"}`} />
              <span className={status.api === "healthy" ? "text-success-custom font-mono" : "text-error-custom font-mono"}>{status.api}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-muted">Qdrant Vector DB</span>
            <span className="flex items-center gap-1">
              <span className={`w-1 h-1 rounded-full ${status.vector_db === "healthy" ? "bg-success-custom animate-pulse" : "bg-error-custom"}`} />
              <span className={status.vector_db === "healthy" ? "text-success-custom font-mono" : "text-error-custom font-mono"}>{status.vector_db}</span>
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-text-muted">Embedding System</span>
            <span className="flex items-center gap-1">
              <span className={`w-1 h-1 rounded-full ${status.embedding_model === "active" ? "bg-success-custom animate-pulse" : "bg-warning-custom"}`} />
              <span className={status.embedding_model === "active" ? "text-success-custom font-mono" : "text-warning-custom font-mono"}>{status.embedding_model}</span>
            </span>
          </div>
        </div>
      </div>
      
      {/* Developer Credits Footer (Aleeya Fatima) */}
      <div className="p-4 border-t border-border-custom flex items-center gap-3 bg-bg-surface/30">
        <div className="w-8 h-8 rounded-lg bg-gold/10 border border-gold/25 flex items-center justify-center text-gold">
          <UserCheck className="w-4 h-4" />
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="text-[11px] font-bold text-text-primary truncate">Aleeya Fatima</p>
          <p className="text-[9px] text-gold-muted truncate font-medium">System Developer</p>
        </div>
      </div>
    </aside>
  );
}
