import React from 'react';
import type { AppMode, PageContext } from '@fpl-companion/shared';
import { Sparkles, Activity, ShieldCheck, AlertCircle } from 'lucide-react';

interface HeaderProps {
  appMode?: AppMode;
  pageContext: PageContext;
  isBackendConnected: boolean;
  geminiConfigured: boolean;
  onToggleMode?: (mode: AppMode) => void;
}

export const Header: React.FC<HeaderProps> = ({
  pageContext,
  isBackendConnected,
  geminiConfigured,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <img
            src="/icons/icon48.png"
            alt="FPL AI Companion"
            className="w-7 h-7 rounded-lg shadow-md border border-purple-500/30"
          />
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              FPL AI Companion
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Gemini 3.8
              </span>
            </h1>
          </div>
        </div>

        {/* Backend Status */}
        <div className="flex items-center gap-1.5">
          {isBackendConnected ? (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full"
              title={geminiConfigured ? 'Connected to Gemini API & Backend' : 'Connected to Local Quantitative Engine'}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              {geminiConfigured ? 'Gemini Live' : 'Local Engine'}
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-950/60 border border-amber-800/50 px-2 py-0.5 rounded-full"
              title="Backend on port 3001 is offline. Start backend with: npm run start:backend"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              Backend Offline
            </span>
          )}
        </div>
      </div>

      {/* FPL Classic Badge & Manager ID */}
      <div className="flex items-center justify-between pt-1">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/40 border border-emerald-800/40 text-[11px] font-semibold text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
          Classic FPL
        </span>

        <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
          <span className="bg-slate-800/80 px-2 py-0.5 rounded text-slate-300 font-mono">
            ID: {pageContext.managerId || 481920}
          </span>
          {pageContext.activeGameweek && (
            <span className="bg-purple-950/60 border border-purple-800/40 px-2 py-0.5 rounded text-purple-300 font-medium">
              GW{pageContext.activeGameweek}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};
