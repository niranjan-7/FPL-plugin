import React, { useState, useEffect } from 'react';
import type { AppMode, PageContext, SquadAuditCard, CaptaincyEvMatrixCard, TransferHorizonCard, BogeyMatrixCard, PriceChangeRadarCard } from '@fpl-companion/shared';
import { StructuredCard } from './StructuredCard.js';
import { Zap, RefreshCw, AlertCircle, TrendingUp, DollarSign } from 'lucide-react';

interface TabAuditProps {
  appMode?: AppMode;
  managerId: number;
  pageContext?: PageContext;
}

const DEFAULT_USER_SQUAD = [
  'Raya', 'Kinsky', 'Truffert', 'Mitchell', 'Virgil', 'Gvardiol', 'Vuskovic',
  'Rogers', 'Schade', 'Yeremy', 'B.Fernandes', 'Mbeumo', 'João Pedro', 'Isak', 'Gonzalo'
];

function resolveLivePlayers(fresh?: PageContext | null, pageContext?: PageContext): string[] {
  if (fresh?.onScreenPlayerNames && fresh.onScreenPlayerNames.length >= 5) {
    return fresh.onScreenPlayerNames;
  }
  if (pageContext?.onScreenPlayerNames && pageContext.onScreenPlayerNames.length >= 5) {
    return pageContext.onScreenPlayerNames;
  }
  return DEFAULT_USER_SQUAD;
}

export const TabAudit: React.FC<TabAuditProps> = ({ managerId, pageContext }) => {
  const [loading, setLoading] = useState(false);
  const [classicAudit, setClassicAudit] = useState<SquadAuditCard | null>(null);
  const [wildcardAudit, setWildcardAudit] = useState<any | null>(null);
  const [chipRoadmap, setChipRoadmap] = useState<any | null>(null);
  const [expertIntel, setExpertIntel] = useState<any | null>(null);
  const [captaincyMatrix, setCaptaincyMatrix] = useState<CaptaincyEvMatrixCard | null>(null);
  const [transferHorizon, setTransferHorizon] = useState<TransferHorizonCard | null>(null);
  const [bogeyRadar, setBogeyRadar] = useState<BogeyMatrixCard | null>(null);
  const [horizonPlan, setHorizonPlan] = useState<any | null>(null);
  const [priceRadar, setPriceRadar] = useState<PriceChangeRadarCard | null>(null);
  const [userBudget, setUserBudget] = useState<number>(pageContext?.totalBudget || 100.5);
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (pageContext?.totalBudget && pageContext.totalBudget > 0) {
      setUserBudget(pageContext.totalBudget);
    }
  }, [pageContext?.totalBudget]);

  // Auto-run squad audit on initial mount so the user never sees an empty screen
  useEffect(() => {
    if (!classicAudit && !loading) {
      runAudit();
    }
  }, []);

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

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    setWildcardAudit(null);
    setChipRoadmap(null);
    setExpertIntel(null);
    setCaptaincyMatrix(null);
    setTransferHorizon(null);
    setHorizonPlan(null);
    setBogeyRadar(null);
    setPriceRadar(null);
    try {
      const fresh = await getFreshPageState();
      const livePlayers = resolveLivePlayers(fresh, pageContext);
      const liveFt = typeof fresh?.freeTransfers === 'number' ? fresh.freeTransfers : (pageContext?.freeTransfers ?? 0);

      const params = new URLSearchParams();
      params.set('ft', liveFt.toString());
      if (livePlayers.length > 0) {
        params.set('players', livePlayers.join(','));
      }
      const res = await fetch(`http://localhost:3001/api/audit/classic/${managerId}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to audit squad');
      const data: SquadAuditCard = await res.json();
      setClassicAudit(data);
    } catch (err: any) {
      setError(err.message || 'Error connecting to backend');
    } finally {
      setLoading(false);
    }
  };

  const runWildcardEvaluation = async () => {
    setLoading(true);
    setError(null);
    setChipRoadmap(null);
    setExpertIntel(null);
    setCaptaincyMatrix(null);
    setTransferHorizon(null);
    setHorizonPlan(null);
    setBogeyRadar(null);
    setPriceRadar(null);
    try {
      const fresh = await getFreshPageState();
      const livePlayers = resolveLivePlayers(fresh, pageContext);
      const liveFt = typeof fresh?.freeTransfers === 'number' ? fresh.freeTransfers : (pageContext?.freeTransfers ?? 0);

      const params = new URLSearchParams();
      params.set('budget', userBudget.toString());
      params.set('ft', liveFt.toString());
      if (livePlayers.length > 0) {
        params.set('players', livePlayers.join(','));
      }
      const res = await fetch(`http://localhost:3001/api/audit/wildcard/${managerId}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to evaluate wildcard');
      const data = await res.json();
      setWildcardAudit(data);
    } catch (err: any) {
      setError(err.message || 'Error evaluating wildcard');
    } finally {
      setLoading(false);
    }
  };

  const runChipRoadmap = async () => {
    setLoading(true);
    setError(null);
    setWildcardAudit(null);
    setExpertIntel(null);
    setCaptaincyMatrix(null);
    setTransferHorizon(null);
    setHorizonPlan(null);
    setBogeyRadar(null);
    setPriceRadar(null);
    try {
      const fresh = await getFreshPageState();
      const livePlayers = resolveLivePlayers(fresh, pageContext);
      const liveFt = typeof fresh?.freeTransfers === 'number' ? fresh.freeTransfers : (pageContext?.freeTransfers ?? 0);

      const params = new URLSearchParams();
      params.set('ft', liveFt.toString());
      if (fresh?.chipsStatus || pageContext?.chipsStatus) {
        params.set('chips', JSON.stringify(fresh?.chipsStatus || pageContext?.chipsStatus));
      }
      if (livePlayers.length > 0) {
        params.set('players', livePlayers.join(','));
      }
      const res = await fetch(`http://localhost:3001/api/audit/chips/${managerId}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to generate chip roadmap');
      const data = await res.json();
      setChipRoadmap(data);
    } catch (err: any) {
      setError(err.message || 'Error generating chip roadmap');
    } finally {
      setLoading(false);
    }
  };

  const runCaptaincyMatrix = async () => {
    setLoading(true);
    setError(null);
    setWildcardAudit(null);
    setChipRoadmap(null);
    setExpertIntel(null);
    setTransferHorizon(null);
    setHorizonPlan(null);
    setBogeyRadar(null);
    setPriceRadar(null);
    try {
      const fresh = await getFreshPageState();
      const livePlayers = resolveLivePlayers(fresh, pageContext);

      const params = new URLSearchParams();
      if (livePlayers.length > 0) {
        params.set('players', livePlayers.join(','));
      }
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`http://localhost:3001/api/audit/captaincy/${managerId}${queryStr}`);
      if (!res.ok) throw new Error('Failed to compute captaincy EV matrix');
      const data: CaptaincyEvMatrixCard = await res.json();
      setCaptaincyMatrix(data);
    } catch (err: any) {
      setError(err.message || 'Error computing captaincy EV matrix');
    } finally {
      setLoading(false);
    }
  };

  const runTransferHorizon = async () => {
    setLoading(true);
    setError(null);
    setWildcardAudit(null);
    setChipRoadmap(null);
    setExpertIntel(null);
    setCaptaincyMatrix(null);
    setBogeyRadar(null);
    setHorizonPlan(null);
    setPriceRadar(null);
    try {
      const fresh = await getFreshPageState();
      const livePlayers = resolveLivePlayers(fresh, pageContext);
      const liveFt = typeof fresh?.freeTransfers === 'number' ? fresh.freeTransfers : (pageContext?.freeTransfers ?? 0);

      const params = new URLSearchParams();
      params.set('ft', liveFt.toString());
      params.set('budget', userBudget.toString());
      if (livePlayers.length > 0) {
        params.set('players', livePlayers.join(','));
      }
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`http://localhost:3001/api/audit/transfer-horizon/${managerId}${queryStr}`);
      if (!res.ok) throw new Error('Failed to calculate transfer horizon');
      const data: TransferHorizonCard = await res.json();
      setTransferHorizon(data);
    } catch (err: any) {
      setError(err.message || 'Error calculating transfer horizon');
    } finally {
      setLoading(false);
    }
  };

  const runBogeyRadar = async () => {
    setLoading(true);
    setError(null);
    setWildcardAudit(null);
    setChipRoadmap(null);
    setExpertIntel(null);
    setCaptaincyMatrix(null);
    setTransferHorizon(null);
    setHorizonPlan(null);
    setPriceRadar(null);
    try {
      const res = await fetch('http://localhost:3001/api/matchup/bogey-matrix');
      if (!res.ok) throw new Error('Failed to load Bogey Ground Curse Matrix');
      const data: BogeyMatrixCard = await res.json();
      setBogeyRadar(data);
    } catch (err: any) {
      setError(err.message || 'Error loading Bogey Ground Curse Matrix');
    } finally {
      setLoading(false);
    }
  };

  const runExpertIntel = async () => {
    setLoading(true);
    setError(null);
    setWildcardAudit(null);
    setChipRoadmap(null);
    setCaptaincyMatrix(null);
    setTransferHorizon(null);
    setHorizonPlan(null);
    setBogeyRadar(null);
    setPriceRadar(null);
    try {
      const fresh = await getFreshPageState();
      const livePlayers = resolveLivePlayers(fresh, pageContext);
      const params = new URLSearchParams();
      if (livePlayers.length > 0) {
        params.set('players', livePlayers.join(','));
      }
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`http://localhost:3001/api/audit/expert-intel${queryStr}`);
      if (!res.ok) throw new Error('Failed to fetch expert intelligence');
      const data = await res.json();
      setExpertIntel(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching expert intelligence');
    } finally {
      setLoading(false);
    }
  };

  const runHorizonPlan = async () => {
    setLoading(true);
    setError(null);
    setWildcardAudit(null);
    setChipRoadmap(null);
    setExpertIntel(null);
    setCaptaincyMatrix(null);
    setTransferHorizon(null);
    setHorizonPlan(null);
    setBogeyRadar(null);
    setPriceRadar(null);
    try {
      const fresh = await getFreshPageState();
      const livePlayers = resolveLivePlayers(fresh, pageContext);
      const liveFt = typeof fresh?.freeTransfers === 'number' ? fresh.freeTransfers : (pageContext?.freeTransfers ?? 0);

      const params = new URLSearchParams();
      params.set('ft', liveFt.toString());
      if (livePlayers.length > 0) {
        params.set('players', livePlayers.join(','));
      }
      const queryStr = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`http://localhost:3001/api/audit/horizon-plan/${managerId}${queryStr}`);
      if (!res.ok) throw new Error('Failed to generate Gameweek Horizon Plan');
      const data = await res.json();
      setHorizonPlan(data);
    } catch (err: any) {
      setError(err.message || 'Error generating horizon plan');
    } finally {
      setLoading(false);
    }
  };

  const runPriceRadar = async () => {
    setLoading(true);
    setError(null);
    setClassicAudit(null);
    setWildcardAudit(null);
    setChipRoadmap(null);
    setExpertIntel(null);
    setCaptaincyMatrix(null);
    setTransferHorizon(null);
    setHorizonPlan(null);
    setBogeyRadar(null);
    try {
      const fresh = await getFreshPageState();
      const livePlayers = resolveLivePlayers(fresh, pageContext);

      const params = new URLSearchParams();
      if (livePlayers.length > 0) {
        params.set('players', livePlayers.join(','));
      }
      if (fresh?.squadPlayersDetailed || pageContext?.squadPlayersDetailed) {
        params.set('squadDetailed', JSON.stringify(fresh?.squadPlayersDetailed || pageContext?.squadPlayersDetailed));
      }
      if (fresh?.targetPlayersDetailed || pageContext?.targetPlayersDetailed) {
        params.set('targetsDetailed', JSON.stringify(fresh?.targetPlayersDetailed || pageContext?.targetPlayersDetailed));
      }

      const res = await fetch(`http://localhost:3001/api/audit/price-changes/${managerId}?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load Price Change Radar');
      const data: PriceChangeRadarCard = await res.json();
      setPriceRadar(data);
    } catch (err: any) {
      setError(err.message || 'Error loading price change radar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Banner */}
      <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 shadow-md space-y-3">
        {/* Header Row: Title on left, Run Audit always clearly visible on right */}
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-white flex items-center gap-1.5 truncate">
              <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Classic Squad Audit</span>
            </h2>
            <p className="text-[10px] text-slate-400 truncate">
              Manager ID: {managerId} • Optimal XI & Captaincy EV
            </p>
          </div>

          <button
            onClick={runAudit}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 shrink-0"
            title="Scan on-screen squad and evaluate optimal XI, captaincy, and transfers"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Evaluating...' : 'Run Audit'}</span>
          </button>
        </div>

        {/* Feature Action Grid */}
        <div className="space-y-2 pt-2.5 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">AI Solvers & Tools</span>
              {isEditingBudget ? (
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-slate-500 font-mono">£</span>
                  <input
                    type="number"
                    step="0.1"
                    min="90"
                    max="120"
                    value={userBudget}
                    onChange={(e) => setUserBudget(parseFloat(e.target.value) || 100.5)}
                    onBlur={() => setIsEditingBudget(false)}
                    autoFocus
                    className="w-14 px-1 py-0.5 text-[11px] font-mono font-bold bg-slate-950 border border-purple-500 rounded text-emerald-400 outline-none text-right"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">m</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingBudget(true)}
                  className="px-2 py-0.5 rounded bg-slate-950/80 border border-slate-800 hover:border-slate-700 text-[10px] font-mono text-slate-300 flex items-center gap-1 transition-all"
                  title="Click to edit manager budget (Squad Value + In Bank)"
                >
                  <span className="text-slate-500">Budget:</span>
                  <span className="text-emerald-400 font-bold">£{userBudget.toFixed(1)}m</span>
                  <span className="text-slate-500 text-[9px]">✏️</span>
                </button>
              )}
            </div>

            {/* Responsive Grid for Solvers */}
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
              <button
                onClick={runWildcardEvaluation}
                disabled={loading}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                  wildcardAudit
                    ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-purple-300 border-purple-500/30 hover:border-purple-400'
                }`}
                title="Evaluate whether to play your Wildcard chip and see the best 15-man squad strictly within your budget"
              >
                <span>🃏</span>
                <span>Wildcard</span>
              </button>

              <button
                onClick={runChipRoadmap}
                disabled={loading}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                  chipRoadmap
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-amber-500/30 hover:border-amber-400'
                }`}
                title="View full season chip strategy roadmap for all 4 chips (Wildcard, Free Hit, Triple Captain, Bench Boost)"
              >
                <span>🎯</span>
                <span>Chips</span>
              </button>

              <button
                onClick={runHorizonPlan}
                disabled={loading}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                  horizonPlan
                    ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-blue-300 border-blue-500/30 hover:border-blue-400'
                }`}
                title="Gameweek-by-Gameweek Horizon Plan (GW9–19) till January deadline with banked FTs, fixture swings, price risk, and Set 1 chip placement"
              >
                <span>🗓️</span>
                <span>GW Plan</span>
              </button>

              <button
                onClick={runCaptaincyMatrix}
                disabled={loading}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                  captaincyMatrix
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-emerald-300 border-emerald-500/30 hover:border-emerald-400'
                }`}
                title="Evaluate Dynamic Captaincy Expected Value (EV) matrix comparing safe template shields vs differential swords"
              >
                <span>👑</span>
                <span>Captain EV</span>
              </button>

              <button
                onClick={runTransferHorizon}
                disabled={loading}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                  transferHorizon
                    ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-cyan-300 border-cyan-500/30 hover:border-cyan-400'
                }`}
                title="Plot 4-Gameweek 5-Free-Transfer rollover roadmap and pinpoint Mini-Wildcard unlock gameweek for 0 hits"
              >
                <span>🔄</span>
                <span>Rollover</span>
              </button>

              <button
                onClick={runBogeyRadar}
                disabled={loading}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                  bogeyRadar
                    ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-indigo-300 border-indigo-500/30 hover:border-indigo-400'
                }`}
                title="Club Bogey Team & Ground Curse Matrix with Vaastav tactical modifiers"
              >
                <span>👻</span>
                <span>Bogey Radar</span>
              </button>

              <button
                onClick={runExpertIntel}
                disabled={loading}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                  expertIntel
                    ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-rose-300 border-rose-500/30 hover:border-rose-400'
                }`}
                title="Synthesized consensus from Fantasy Football Scout, Let's Talk FPL, FPL Focal, and FPL Harry"
              >
                <span>🎙️</span>
                <span>Intel</span>
              </button>

              <button
                onClick={runPriceRadar}
                disabled={loading}
                className={`px-2 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all border ${
                  priceRadar
                    ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-500/30'
                    : 'bg-slate-900/90 hover:bg-slate-800 text-amber-300 border-amber-500/30 hover:border-amber-400'
                }`}
                title="Monitor overnight price change probabilities and budget protection"
              >
                <span>📈</span>
                <span>Price Radar</span>
              </button>
            </div>
          </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{error}. Ensure the backend server is running on port 3001.</span>
        </div>
      )}

      {/* Render Audit Output */}
      {expertIntel && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-rose-400 uppercase tracking-wider">Expert Scout & Video Intel</span>
            <button
              onClick={() => setExpertIntel(null)}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Close Intel
            </button>
          </div>
          <StructuredCard card={expertIntel} />
        </div>
      )}

      {chipRoadmap && !expertIntel && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Chip Strategy Roadmap</span>
            <button
              onClick={() => setChipRoadmap(null)}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Close Roadmap
            </button>
          </div>
          <StructuredCard card={chipRoadmap} />
        </div>
      )}

      {wildcardAudit && !chipRoadmap && !expertIntel && !captaincyMatrix && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">Wildcard Chip Strategy</span>
            {classicAudit && (
              <button
                onClick={() => setWildcardAudit(null)}
                className="text-[10px] text-slate-400 hover:text-white underline"
              >
                Show Squad Audit
              </button>
            )}
          </div>
          <StructuredCard card={wildcardAudit} />
        </div>
      )}

      {captaincyMatrix && !chipRoadmap && !expertIntel && !wildcardAudit && !transferHorizon && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">Dynamic Captaincy EV Matrix</span>
            <button
              onClick={() => setCaptaincyMatrix(null)}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Close Matrix
            </button>
          </div>
          <StructuredCard card={captaincyMatrix} />
        </div>
      )}

      {transferHorizon && !chipRoadmap && !expertIntel && !wildcardAudit && !captaincyMatrix && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">5-FT Rollover & Mini-Wildcard Solver</span>
            <button
              onClick={() => setTransferHorizon(null)}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Close Solver
            </button>
          </div>
          <StructuredCard card={transferHorizon} />
        </div>
      )}

      {bogeyRadar && !chipRoadmap && !expertIntel && !wildcardAudit && !captaincyMatrix && !transferHorizon && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-purple-400 uppercase tracking-wider">👻 Bogey Team & Ground Curse Matrix</span>
            <button
              onClick={() => setBogeyRadar(null)}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Close Radar
            </button>
          </div>
          <StructuredCard card={bogeyRadar} />
        </div>
      )}

      {horizonPlan && !expertIntel && !chipRoadmap && !wildcardAudit && !captaincyMatrix && !transferHorizon && !bogeyRadar && !priceRadar && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">🗓️ Master Gameweek Roadmap (GW9–19)</span>
            <button
              onClick={() => setHorizonPlan(null)}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Close Plan
            </button>
          </div>
          <StructuredCard card={horizonPlan} />
        </div>
      )}

      {priceRadar && !expertIntel && !chipRoadmap && !wildcardAudit && !captaincyMatrix && !transferHorizon && !bogeyRadar && !horizonPlan && (
        <div className="space-y-2">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">📈 Overnight Price & Budget Protection</span>
            <button
              onClick={() => setPriceRadar(null)}
              className="text-[10px] text-slate-400 hover:text-white underline"
            >
              Close Radar
            </button>
          </div>
          <StructuredCard card={priceRadar} />
        </div>
      )}

      {!horizonPlan && !priceRadar && !bogeyRadar && !transferHorizon && !captaincyMatrix && !wildcardAudit && !chipRoadmap && !expertIntel && classicAudit && <StructuredCard card={classicAudit} />}

      {!classicAudit && !priceRadar && !horizonPlan && !bogeyRadar && !transferHorizon && !captaincyMatrix && !wildcardAudit && !chipRoadmap && !expertIntel && !loading && (
        <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800 bg-slate-900/30 text-slate-400 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-emerald-400 font-bold shadow-inner">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs font-semibold text-slate-200">No active audit loaded</div>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto mt-0.5">
              Scan your live on-screen squad for transfers, captaincy EV, and starting XI optimization.
            </p>
          </div>
          <button
            onClick={runAudit}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-bold text-xs inline-flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Evaluate On-Screen Squad Now</span>
          </button>
        </div>
      )}
    </div>
  );
};
