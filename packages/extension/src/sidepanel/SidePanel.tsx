import React, { useState } from 'react';
import { Header } from './components/Header.js';
import { TabAudit } from './components/TabAudit.js';
import { TabMatchup } from './components/TabMatchup.js';
import { TabAskGemini } from './components/TabAskGemini.js';
import { useExtensionSync } from './hooks/useExtensionSync.js';
import { Zap, Shield, MessageSquare } from 'lucide-react';

export const SidePanel: React.FC = () => {
  const { pageContext, isBackendConnected, geminiConfigured } = useExtensionSync();
  const [activeTab, setActiveTab] = useState<'audit' | 'matchup' | 'chat'>('audit');

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans select-none">
      <Header
        pageContext={pageContext}
        isBackendConnected={isBackendConnected}
        geminiConfigured={geminiConfigured}
      />

      {/* Main Tab Switcher */}
      <nav className="flex border-b border-slate-800/80 bg-slate-900/50 px-3 pt-2 gap-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex-1 pb-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'audit'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          Squad Audit
        </button>

        <button
          onClick={() => setActiveTab('matchup')}
          className={`flex-1 pb-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'matchup'
              ? 'border-purple-400 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          Matchups & FDR
        </button>

        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 pb-2 flex items-center justify-center gap-1.5 border-b-2 transition-all ${
            activeTab === 'chat'
              ? 'border-cyan-400 text-cyan-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          Ask Gemini
        </button>
      </nav>

      {/* Tab Content Body */}
      <main className="flex-1 overflow-y-auto p-3">
        {activeTab === 'audit' && (
          <TabAudit
            managerId={pageContext.managerId || 481920}
            pageContext={pageContext}
          />
        )}

        {activeTab === 'matchup' && <TabMatchup />}

        {activeTab === 'chat' && (
          <TabAskGemini
            managerId={pageContext.managerId || 481920}
            geminiConfigured={geminiConfigured}
            pageContext={pageContext}
          />
        )}
      </main>

      {/* Footer Branding */}
      <footer className="border-t border-slate-900 bg-slate-950 px-3 py-1.5 text-[10px] text-slate-500 flex items-center justify-between">
        <span>Powered by Gemini 3.8 Flash & Vaastav FPL</span>
        <span>v1.0.0</span>
      </footer>
    </div>
  );
};
