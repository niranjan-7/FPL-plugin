import React, { useState } from 'react';
import type { PlayerComparisonCard, MatchupEvaluationCard, BogeyMatrixCard } from '@fpl-companion/shared';
import { StructuredCard } from './StructuredCard.js';
import { Shield, Users, Calendar, ArrowRight, RefreshCw, AlertTriangle, Flame, Ghost } from 'lucide-react';

const ALL_20_PL_TEAMS = [
  'Arsenal',
  'Aston Villa',
  'Bournemouth',
  'Brentford',
  'Brighton',
  'Chelsea',
  'Coventry City',
  'Crystal Palace',
  'Everton',
  'Fulham',
  'Hull City',
  'Ipswich Town',
  'Leeds',
  'Liverpool',
  'Man City',
  'Man Utd',
  'Newcastle',
  "Nott'm Forest",
  'Spurs',
  'Sunderland',
];

export const TabMatchup: React.FC = () => {
  const [subTab, setSubTab] = useState<'h2h' | 'playerLab' | 'fdr' | 'bogey'>('bogey');

  // H2H state
  const [availableTeams, setAvailableTeams] = useState<string[]>(ALL_20_PL_TEAMS);
  const [teamA, setTeamA] = useState('Arsenal');
  const [teamB, setTeamB] = useState('Chelsea');
  const [h2hCard, setH2hCard] = useState<MatchupEvaluationCard | null>(null);
  const [loadingH2h, setLoadingH2h] = useState(false);

  // Player Lab state
  const [playersInput, setPlayersInput] = useState('Haaland, Palmer');
  const [compCard, setCompCard] = useState<PlayerComparisonCard | null>(null);
  const [loadingComp, setLoadingComp] = useState(false);

  // FDR state
  const [fdrTeamId, setFdrTeamId] = useState(19); // 19 = Spurs (top target)
  const [fdrList, setFdrList] = useState<Array<{ gw: number; opponentShort: string; isHome: boolean; fplFdr: number; adjustedFdr: number }>>([]);
  const [loadingFdr, setLoadingFdr] = useState(false);
  const [fdrLeaderboard, setFdrLeaderboard] = useState<any[]>([]);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(false);
  const [fdrViewMode, setFdrViewMode] = useState<'RANKINGS' | 'INSPECTOR'>('RANKINGS');

  // Bogey Matrix state
  const [bogeyCard, setBogeyCard] = useState<BogeyMatrixCard | null>(null);
  const [loadingBogey, setLoadingBogey] = useState(false);
  const [bogeyFilter, setBogeyFilter] = useState<'ALL' | 'BOGEY' | 'BULLY' | 'FORTRESS'>('ALL');

  React.useEffect(() => {
    fetchTeams();
    if (!bogeyCard) {
      fetchBogeyMatrix();
    }
    if (fdrLeaderboard.length === 0) {
      fetchFdrLeaderboard();
    }
  }, []);

  const fetchTeams = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/fpl/teams');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((t: any) => t.name).sort();
          setAvailableTeams(names);
        }
      }
    } catch (err) {
      console.warn('Using default 20 PL teams fallback:', err);
    }
  };

  const fetchFdrLeaderboard = async () => {
    setLoadingLeaderboard(true);
    try {
      const res = await fetch('http://localhost:3001/api/matchup/fdr-leaderboard');
      if (res.ok) {
        const data = await res.json();
        setFdrLeaderboard(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  const fetchBogeyMatrix = async () => {
    setLoadingBogey(true);
    try {
      const res = await fetch('http://localhost:3001/api/matchup/bogey-matrix');
      if (res.ok) {
        const data: BogeyMatrixCard = await res.json();
        setBogeyCard(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingBogey(false);
    }
  };

  const fetchH2h = async () => {
    setLoadingH2h(true);
    try {
      const res = await fetch(`http://localhost:3001/api/matchup/h2h?teamA=${teamA}&teamB=${teamB}`);
      if (res.ok) {
        const data = await res.json();
        setH2hCard(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingH2h(false);
    }
  };

  const fetchComparison = async () => {
    setLoadingComp(true);
    try {
      const res = await fetch(`http://localhost:3001/api/matchup/player-comparison?players=${encodeURIComponent(playersInput)}`);
      if (res.ok) {
        const data = await res.json();
        setCompCard(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingComp(false);
    }
  };

  const fetchFdr = async (id: number) => {
    setFdrTeamId(id);
    setLoadingFdr(true);
    try {
      const res = await fetch(`http://localhost:3001/api/matchup/fdr-matrix/${id}`);
      if (res.ok) {
        const data = await res.json();
        setFdrList(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingFdr(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Subtab navigation */}
      <div className="flex rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs font-medium">
        <button
          onClick={() => setSubTab('h2h')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
            subTab === 'h2h' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5 text-purple-400" />
          Club H2H
        </button>
        <button
          onClick={() => setSubTab('playerLab')}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
            subTab === 'playerLab' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5 text-emerald-400" />
          Player Lab
        </button>
        <button
          onClick={() => {
            setSubTab('fdr');
            if (fdrLeaderboard.length === 0) fetchFdrLeaderboard();
            if (fdrList.length === 0) fetchFdr(19);
          }}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
            subTab === 'fdr' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
          5-GW FDR
        </button>
        <button
          onClick={() => {
            setSubTab('bogey');
            if (!bogeyCard) fetchBogeyMatrix();
          }}
          className={`flex-1 py-1.5 rounded-md flex items-center justify-center gap-1 transition-all ${
            subTab === 'bogey' ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <span className="text-xs">👻</span>
          Bogey Radar
        </button>
      </div>

      {/* Subtab 1: Club H2H */}
      {subTab === 'h2h' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
            <div className="text-xs font-bold text-white">Evaluate Club Matchup History</div>
            <div className="flex items-center gap-2">
              <select
                value={teamA}
                onChange={(e) => setTeamA(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-purple-500"
              >
                {availableTeams.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <span className="text-xs text-slate-500 font-bold">vs</span>
              <select
                value={teamB}
                onChange={(e) => setTeamB(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-purple-500"
              >
                {availableTeams.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button
                onClick={fetchH2h}
                disabled={loadingH2h}
                className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs"
              >
                {loadingH2h ? '...' : 'Analyze'}
              </button>
            </div>
          </div>

          {h2hCard && <StructuredCard card={h2hCard} />}
        </div>
      )}

      {/* Subtab 2: Player Lab */}
      {subTab === 'playerLab' && (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
            <div className="text-xs font-bold text-white">Compare Players (YoY & Regression)</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={playersInput}
                onChange={(e) => setPlayersInput(e.target.value)}
                placeholder="e.g. Haaland, Palmer, Salah"
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white flex-1 focus:outline-none focus:border-emerald-500"
              />
              <button
                onClick={fetchComparison}
                disabled={loadingComp}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                {loadingComp ? '...' : 'Compare'}
              </button>
            </div>
          </div>

          {compCard && <StructuredCard card={compCard} />}
        </div>
      )}

      {/* Subtab 3: 5-GW FDR */}
      {subTab === 'fdr' && (
        <div className="space-y-3">
          {/* View Mode Toggle & Overview */}
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>📅</span> 5-GW Rolling Fixture Difficulty Rating
                </div>
                <div className="text-[10px] text-slate-400">
                  Venue & tactical multi-year adjusted difficulty across all 20 Premier League clubs
                </div>
              </div>
              <button
                onClick={fetchFdrLeaderboard}
                disabled={loadingLeaderboard}
                className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] text-cyan-400 font-bold hover:bg-slate-800 transition-all flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${loadingLeaderboard ? 'animate-spin' : ''}`} />
                <span>Sync</span>
              </button>
            </div>

            {/* View Mode Toggle Buttons */}
            <div className="flex rounded-lg bg-slate-950 p-0.5 border border-slate-800 text-xs">
              <button
                onClick={() => setFdrViewMode('RANKINGS')}
                className={`flex-1 py-1 rounded font-bold text-[11px] transition-all cursor-pointer ${
                  fdrViewMode === 'RANKINGS'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🏆 All 20 Clubs Ranked & Targets
              </button>
              <button
                onClick={() => setFdrViewMode('INSPECTOR')}
                className={`flex-1 py-1 rounded font-bold text-[11px] transition-all cursor-pointer ${
                  fdrViewMode === 'INSPECTOR'
                    ? 'bg-cyan-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🔍 Club Schedule Inspector
              </button>
            </div>

            {/* Quick Filter Strip */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
              <div className="p-1.5 rounded bg-emerald-950/20 border border-emerald-900/40">
                <div className="text-[9px] text-emerald-400 font-sans font-bold">🟢 Top Targets</div>
                <div className="text-[11px] font-black text-emerald-300">Avg FDR ≤ 2.8</div>
              </div>
              <div className="p-1.5 rounded bg-amber-950/20 border border-amber-900/40">
                <div className="text-[9px] text-amber-400 font-sans font-bold">🟡 Moderate</div>
                <div className="text-[11px] font-black text-amber-300">Avg FDR 2.9 - 3.3</div>
              </div>
              <div className="p-1.5 rounded bg-rose-950/20 border border-rose-900/40">
                <div className="text-[9px] text-rose-400 font-sans font-bold">🔴 Fixture Cliffs</div>
                <div className="text-[11px] font-black text-rose-300">Avg FDR ≥ 3.4</div>
              </div>
            </div>
          </div>

          {/* VIEW 1: Complete 20-Club Ranked Leaderboard */}
          {fdrViewMode === 'RANKINGS' && (
            <div className="space-y-2">
              {loadingLeaderboard && fdrLeaderboard.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400 flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>Computing 20-club fixture ratings & player targets...</span>
                </div>
              ) : (
                fdrLeaderboard.map((team, idx) => {
                  const rank = idx + 1;
                  const isTopTarget = team.avg5Fdr <= 2.8;
                  const isCliff = team.avg5Fdr >= 3.4;

                  const badgeColor = isTopTarget
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : isCliff
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40';

                  const cardBg = isTopTarget
                    ? 'bg-gradient-to-r from-emerald-950/20 to-slate-900/90 border-emerald-900/40'
                    : isCliff
                    ? 'bg-gradient-to-r from-rose-950/20 to-slate-900/90 border-rose-900/40'
                    : 'bg-slate-900/90 border-slate-800';

                  return (
                    <div key={team.id} className={`p-3 rounded-xl border space-y-2 shadow-sm ${cardBg}`}>
                      {/* Header: Rank, Name, Avg FDR */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] ${
                              rank <= 3
                                ? 'bg-amber-400 text-slate-950'
                                : rank <= 6
                                ? 'bg-emerald-500 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{rank}
                          </span>
                          <div>
                            <span className="font-bold text-white text-xs">{team.name}</span>
                            <span className="text-[10px] text-slate-400 ml-1">({team.shortName})</span>
                          </div>
                          {isTopTarget && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                              TARGET
                            </span>
                          )}
                          {isCliff && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                              AVOID
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-[10px] text-slate-500">5-GW Avg:</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold border ${badgeColor}`}>
                            {team.avg5Fdr}
                          </span>
                        </div>
                      </div>

                      {/* 5-GW Fixtures Ticker */}
                      <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none font-mono text-[10px]">
                        {team.fixtures.map((f: any, fIdx: number) => {
                          const fColor =
                            f.adjFdr <= 2.2
                              ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                              : f.adjFdr <= 3.2
                              ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                              : 'bg-rose-500/15 text-rose-300 border-rose-500/30';

                          return (
                            <div
                              key={fIdx}
                              className={`px-1.5 py-0.5 rounded border flex items-center gap-1 shrink-0 ${fColor}`}
                              title={`GW${f.gw} ${f.desc} • Raw: ${f.rawFdr} | Adj: ${f.adjFdr}`}
                            >
                              <span className="text-[9px] text-slate-400">{f.gw}:</span>
                              <span className="font-semibold">{f.desc}</span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Top Players to Target */}
                      <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <div className="flex items-center gap-2 flex-wrap">
                          {team.keyAttacker && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">🎯 Attacker:</span>
                              <span className="font-semibold text-emerald-400">
                                {team.keyAttacker.name} (£{team.keyAttacker.cost}m, Form: {team.keyAttacker.form})
                              </span>
                            </div>
                          )}
                          {team.bestDefender && (
                            <div className="flex items-center gap-1">
                              <span className="text-[9px] font-bold text-slate-500 uppercase">🛡️ Def/GK:</span>
                              <span className="font-semibold text-cyan-300">
                                {team.bestDefender.name} (£{team.bestDefender.cost}m)
                              </span>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            fetchFdr(team.id);
                            setFdrViewMode('INSPECTOR');
                          }}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 font-bold shrink-0 ml-1 underline cursor-pointer"
                        >
                          Inspect ➔
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* VIEW 2: Single Club Schedule Inspector */}
          {fdrViewMode === 'INSPECTOR' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Select Club (All 20 Teams):
                  </span>
                  <button
                    onClick={() => setFdrViewMode('RANKINGS')}
                    className="text-[10px] text-cyan-400 hover:underline font-bold cursor-pointer"
                  >
                    ⬅ Back to Rankings
                  </button>
                </div>
                <div className="flex gap-1.5 flex-wrap max-h-32 overflow-y-auto pr-1">
                  {fdrLeaderboard.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => fetchFdr(team.id)}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all border cursor-pointer ${
                        fdrTeamId === team.id
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                          : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {team.shortName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Detailed 5-GW Venue & Tactical Adjusted Schedule:
                </div>
                {loadingFdr ? (
                  <div className="text-center py-4 text-xs text-slate-400">Loading fixture schedule...</div>
                ) : (
                  <div className="space-y-1.5">
                    {fdrList.map((f, idx) => {
                      const fdrColor =
                        f.adjustedFdr <= 2.2
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : f.adjustedFdr <= 3.2
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border-rose-500/30';

                      return (
                        <div key={idx} className="p-2 rounded-lg bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-slate-400 font-bold">GW{f.gw}</span>
                            <span className="font-semibold text-white">
                              {f.isHome ? `vs ${f.opponentShort} (H)` : `@ ${f.opponentShort} (A)`}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-[10px] text-slate-500">Official FDR: {f.fplFdr}</span>
                            <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${fdrColor}`}>
                              {f.adjustedFdr} Adjusted
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subtab 4: Bogey Radar & Ground Curse Matrix */}
      {subTab === 'bogey' && (
        <div className="space-y-3">
          {/* Hero Banner */}
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-purple-950/60 via-slate-950 to-rose-950/40 border border-purple-500/30 shadow-lg space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-base">👻</span>
                <div>
                  <div className="text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                    Vaastav Historical DB
                  </div>
                  <div className="text-xs font-black text-white">
                    Club Bogey Team & Ground Curse Matrix
                  </div>
                </div>
              </div>
              <button
                onClick={fetchBogeyMatrix}
                disabled={loadingBogey}
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-purple-500/40 text-purple-300 font-bold text-[10px] flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${loadingBogey ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <p className="text-[10px] text-slate-300 leading-snug">
              Standard FDR rates trips to Everton, Spurs, or Palace as a "3" based on table standings. This matrix uncovers multi-year tactical venue curses and flat-track bully bonanzas.
            </p>

            {/* Metric Pills */}
            {bogeyCard && (
              <div className="grid grid-cols-3 gap-1.5 pt-1 text-center font-mono">
                <div className="p-1.5 rounded bg-slate-950/80 border border-rose-900/40">
                  <div className="text-[9px] text-slate-400 font-sans">Bogey Curses</div>
                  <div className="text-xs font-black text-rose-400">{bogeyCard.bogeyCount} Curses</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950/80 border border-amber-900/40">
                  <div className="text-[9px] text-slate-400 font-sans">Flat-Track Bullies</div>
                  <div className="text-xs font-black text-amber-400">{bogeyCard.flatTrackCount} Matches</div>
                </div>
                <div className="p-1.5 rounded bg-slate-950/80 border border-cyan-900/40">
                  <div className="text-[9px] text-slate-400 font-sans">Home Fortresses</div>
                  <div className="text-xs font-black text-cyan-400">{bogeyCard.fortressCount} Fortresses</div>
                </div>
              </div>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setBogeyFilter('ALL')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                bogeyFilter === 'ALL'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Matchups ({bogeyCard?.fixtures.length || 0})
            </button>
            <button
              onClick={() => setBogeyFilter('BOGEY')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                bogeyFilter === 'BOGEY'
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👻 Bogey Curses ({bogeyCard?.bogeyCount || 0})
            </button>
            <button
              onClick={() => setBogeyFilter('BULLY')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                bogeyFilter === 'BULLY'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🔨 Bullies ({bogeyCard?.flatTrackCount || 0})
            </button>
            <button
              onClick={() => setBogeyFilter('FORTRESS')}
              className={`px-2 py-1 rounded text-[10px] font-semibold transition-all ${
                bogeyFilter === 'FORTRESS'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              🏰 Fortresses ({bogeyCard?.fortressCount || 0})
            </button>
          </div>

          {/* Fixtures List */}
          {loadingBogey && !bogeyCard ? (
            <div className="text-center py-6 text-xs text-slate-400">Loading ground curse records...</div>
          ) : (
            <div className="space-y-2">
              {bogeyCard?.fixtures
                .filter((f) => {
                  if (bogeyFilter === 'BOGEY') return f.modifierType === 'BOGEY_GROUND_CURSE';
                  if (bogeyFilter === 'BULLY') return f.modifierType === 'FLAT_TRACK_BULLY';
                  if (bogeyFilter === 'FORTRESS') return f.modifierType === 'GROUND_FORTRESS';
                  return true;
                })
                .map((item) => {
                  const isBogey = item.modifierType === 'BOGEY_GROUND_CURSE';
                  const isBully = item.modifierType === 'FLAT_TRACK_BULLY';
                  const isFortress = item.modifierType === 'GROUND_FORTRESS';

                  return (
                    <div
                      key={item.fixtureId}
                      className={`p-3 rounded-lg border space-y-2 transition-all ${
                        isBogey
                          ? 'bg-rose-950/20 border-rose-500/40'
                          : isBully
                          ? 'bg-amber-950/20 border-amber-500/40'
                          : isFortress
                          ? 'bg-cyan-950/20 border-cyan-500/40'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      {/* Matchup & Badge Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-bold text-white text-xs">
                          <span>{item.homeTeam}</span>
                          <span className="text-slate-500 text-[10px]">vs</span>
                          <span>{item.awayTeam}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-bold border uppercase tracking-wider ${
                            isBogey
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : isBully
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : isFortress
                              ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {item.badgeLabel}
                        </span>
                      </div>

                      {/* Stadium & FDR comparison */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>📍 {item.stadiumName}</span>
                        <div className="flex items-center gap-2">
                          <span>Official: {item.officialFdrAway} FDR</span>
                          <span className="font-bold text-white">
                            ➔ Adjusted: <span className={isBogey ? 'text-rose-400 font-black' : isBully ? 'text-emerald-400 font-black' : 'text-cyan-400'}>{item.adjustedFdrAway}</span>
                          </span>
                        </div>
                      </div>

                      {/* H2H Stat pill */}
                      <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-400">{item.h2hSummary.last5Meetings}</span>
                        <span className={item.h2hSummary.cleanSheetRateAway === 0 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                          Away CS Rate: {(item.h2hSummary.cleanSheetRateAway * 100).toFixed(0)}%
                        </span>
                      </div>

                      {/* Tactical FPL Advice */}
                      <p className="text-[11px] text-slate-300 leading-snug">
                        💡 {item.tacticalFplAdvice}
                      </p>

                      {/* Key Assets */}
                      {item.affectedTopAssets && item.affectedTopAssets.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 border-t border-slate-800/60 text-[9px] text-slate-400">
                          <span className="font-bold uppercase text-slate-500">Key Assets:</span>
                          <span className="text-emerald-400 font-semibold">{item.affectedTopAssets.join(', ')}</span>
                        </div>
                      )}

                      {/* Ruled Out / Injured Stars */}
                      {item.injuredStars && item.injuredStars.length > 0 && (
                        <div className="flex items-center gap-1 text-[9px] text-rose-400">
                          <span className="font-bold uppercase text-rose-500 shrink-0">⚠️ Ruled Out:</span>
                          <span className="line-through text-rose-300/80">{item.injuredStars.join(', ')}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
