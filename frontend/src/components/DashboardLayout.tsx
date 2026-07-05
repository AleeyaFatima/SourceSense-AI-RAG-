"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-primary flex text-text-primary font-sans antialiased relative bg-grid">
      {/* Ambient glowing backdrop */}
      <div className="absolute inset-0 ambient-glow pointer-events-none z-0" />

      {/* Mobile Top Header */}
      <header className="lg:hidden w-full h-16 bg-bg-card border-b border-border-custom fixed top-0 left-0 z-30 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gold/10 border border-gold/30 flex items-center justify-center">
            <span className="text-gold font-bold text-xs">S</span>
          </div>
          <span className="font-display font-semibold text-xs tracking-wider text-text-primary uppercase">SourceSense AI</span>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg border border-border-custom bg-bg-surface hover:text-gold transition-colors"
          aria-label="Toggle navigation menu"
        >
          {isOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </header>

      {/* Desktop Sidebar Wrapper */}
      <div className={`fixed inset-y-0 left-0 z-40 transform lg:translate-x-0 transition-transform duration-300 ease-in-out ${
        isOpen ? "translate-x-0" : "-translate-x-full lg:block"
      }`}>
        <Sidebar />
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/80 z-30 lg:hidden backdrop-blur-md"
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 lg:pl-64 pt-16 lg:pt-0 min-h-screen flex flex-col w-full overflow-x-hidden relative z-10">
        <div className="p-4 md:p-6 flex-1 w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
