import React, { useState } from 'react';
import type { AppMode, PageContext, ChatResponse, AnyStructuredCard } from '@fpl-companion/shared';
import { StructuredCard } from './StructuredCard.js';
import { Send, Bot, User, Sparkles, AlertCircle } from 'lucide-react';

interface TabAskGeminiProps {
  appMode?: AppMode;
  managerId: number;
  geminiConfigured: boolean;
  pageContext?: PageContext;
}

interface Message {
  role: 'user' | 'assistant';
  text: string;
  card?: AnyStructuredCard;
  isFallback?: boolean;
}

const DEFAULT_USER_SQUAD = [
  'Raya', 'Kinsky', 'Truffert', 'Mitchell', 'Virgil', 'Gvardiol', 'Vuskovic',
  'Rogers', 'Schade', 'Yeremy', 'B.Fernandes', 'Mbeumo', 'João Pedro', 'Isak', 'Gonzalo'
];

export const TabAskGemini: React.FC<TabAskGeminiProps> = ({
  managerId,
  geminiConfigured,
  pageContext,
}) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: `Hello Manager! I am your **FPL Quantitative Analyst**.\n\nI combine **Vaastav's 3-year multi-season archive** (per-90 baselines, finishing variance, stadium resistance) with **live 2026/27 performance** to give you true Bayesian Expected Value advice.\n\nAsk me anything or use the quick chips below:`,
    },
  ]);

  const quickChips = [
    'Who should I captain this gameweek?',
    'Gameweek-by-Gameweek plan till January',
    'Compare Haaland vs Palmer',
    'Audit my starting XI and suggest transfers',
  ];

  const getFreshPageState = async (): Promise<PageContext | undefined> => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          const freshContext: PageContext = await chrome.tabs.sendMessage(tab.id, { action: 'GET_PAGE_STATE' });
          if (freshContext) {
            return freshContext;
          }
        }
      } catch (e) {
        // Fallback to pageContext
      }
    }
    return pageContext;
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = (textToSend || input).trim();
    if (!prompt || loading) return;

    const userMsg: Message = { role: 'user', text: prompt };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const fresh = await getFreshPageState();
      const livePlayers =
        fresh?.onScreenPlayerNames && fresh.onScreenPlayerNames.length >= 5
          ? fresh.onScreenPlayerNames
          : pageContext?.onScreenPlayerNames && pageContext.onScreenPlayerNames.length >= 5
          ? pageContext.onScreenPlayerNames
          : DEFAULT_USER_SQUAD;
      const liveFt = typeof fresh?.freeTransfers === 'number' ? fresh.freeTransfers : (pageContext?.freeTransfers ?? 0);

      const res = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          context: {
            mode: 'classic',
            managerId,
            onScreenPlayers: livePlayers,
            totalBudget: fresh?.totalBudget || pageContext?.totalBudget,
            freeTransfers: liveFt,
            chipsStatus: fresh?.chipsStatus || pageContext?.chipsStatus,
          },
        }),
      });

      if (!res.ok) throw new Error('Backend chat error');
      const data: ChatResponse = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: data.text,
          card: data.structuredCard,
          isFallback: data.isFallbackMock,
        },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ Error contacting backend: ${err.message || 'Server offline'}. Please ensure \`npm run start:backend\` is running.`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[520px]">
      {/* Configuration Status Notice */}
      {!geminiConfigured && (
        <div className="mb-2 p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-start gap-1.5">
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-emerald-400 mt-0.5" />
          <span>
            Operating in <strong>Local Quantitative Engine</strong> mode. To unlock open-ended conversational reasoning, add your <code>GEMINI_API_KEY</code> in <code>/backend/.env</code>.
          </span>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1 pb-2">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex gap-2 text-xs ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {m.role === 'assistant' && (
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5 font-bold">
                <Bot className="w-3.5 h-3.5" />
              </div>
            )}
            <div
              className={`max-w-[88%] rounded-xl px-3 py-2.5 leading-relaxed space-y-2 ${
                m.role === 'user'
                  ? 'bg-emerald-600 text-white font-medium'
                  : 'bg-slate-900 border border-slate-800 text-slate-200'
              }`}
            >
              <div className="whitespace-pre-wrap">{m.text}</div>
              {m.card && (
                <div className="pt-2">
                  <StructuredCard card={m.card} />
                </div>
              )}
            </div>
            {m.role === 'user' && (
              <div className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center shrink-0 mt-0.5">
                <User className="w-3.5 h-3.5" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-400 italic">
            <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
            Gemini is calculating Bayesian expected returns...
          </div>
        )}
      </div>

      {/* Quick Prompt Chips */}
      <div className="py-2 flex gap-1.5 overflow-x-auto no-scrollbar">
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(chip)}
            disabled={loading}
            className="px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] text-slate-300 font-medium whitespace-nowrap transition-all hover:border-slate-700"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Field */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
        className="flex gap-2 pt-1 border-t border-slate-800"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about transfers, captain EV, fixture swings..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="px-3 py-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 font-bold rounded-lg transition-all"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
