import React, { useState } from 'react';
import type {
  AnyStructuredCard,
  SquadAuditCard,
  PlayerComparisonCard,
  MatchupEvaluationCard,
  WildcardStrategyCard,
  ChipRoadmapCard,
  ExpertIntelCard,
  CaptaincyEvMatrixCard,
  TransferHorizonCard,
  BogeyMatrixCard,
  HorizonPlannerCard,
  PriceChangeRadarCard,
  PlayerPriceChangeDetail,
} from '@fpl-companion/shared';
import {
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Zap,
  Shield,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Flame,
  AlertCircle,
  Clock,
  Sparkles,
  Ghost,
} from 'lucide-react';

interface StructuredCardProps {
  card: AnyStructuredCard;
}

export const StructuredCard: React.FC<StructuredCardProps> = ({ card }) => {
  // 1. WILDCARD STRATEGY CARD
  if (card.type === 'WILDCARD_STRATEGY') {
    const wc = card as WildcardStrategyCard;
    const isActivate = wc.verdict === 'ACTIVATE_WILDCARD_NOW';

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-xl space-y-3.5">
        {/* Header Verdict */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-slate-950 ${
                isActivate
                  ? 'bg-gradient-to-tr from-rose-500 to-amber-400'
                  : 'bg-gradient-to-tr from-blue-500 to-cyan-400'
              }`}
            >
              WC
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Wildcard Analysis</div>
              <div className={`font-black text-sm tracking-tight ${isActivate ? 'text-rose-400' : 'text-cyan-400'}`}>
                {isActivate ? 'ACTIVATE WILDCARD NOW' : 'HOLD WILDCARD'}
              </div>
            </div>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
              isActivate
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
            }`}
          >
            {wc.confidence}% Confidence
          </span>
        </div>

        {/* Reasoning */}
        <p className="text-slate-300 leading-relaxed text-[11px] bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
          {wc.reasoning}
        </p>

        {/* Crisis Breakdown Stats */}
        <div className="grid grid-cols-2 gap-2">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] text-slate-400">Transfer Hits Saved:</div>
            <div className="text-sm font-black text-emerald-400 font-mono">+{wc.teamCrisisSummary.pointHitsSaved} pts</div>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] text-slate-400">Projected 5-GW Gain:</div>
            <div className="text-sm font-black text-cyan-400 font-mono">+{wc.teamCrisisSummary.projected5GwGain} xP</div>
          </div>
        </div>

        {/* Transfer Delta & Retained Core Section */}
        {wc.transferDelta && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-cyan-400">🔄 {wc.transferDelta.totalTransfersNeeded} Direct Transfers Required</span>
              <span className="text-emerald-400 text-[10px] font-mono">{wc.transferDelta.budgetUtilizationPercent}% Budget Utilized</span>
            </div>

            {wc.transferDelta.retainedPlayers && wc.transferDelta.retainedPlayers.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
                <span className="text-slate-400 font-semibold">Retained Core ({wc.transferDelta.retainedPlayers.length}):</span>
                {wc.transferDelta.retainedPlayers.map((r: any) => (
                  <span key={r.name} className="px-1.5 py-0.5 rounded bg-emerald-950/70 text-emerald-400 border border-emerald-800/60 font-medium">
                    ✓ {r.name} ({r.team})
                  </span>
                ))}
              </div>
            )}

            {wc.transferDelta.directSwaps && wc.transferDelta.directSwaps.length > 0 && (
              <details className="text-[10px] text-slate-300">
                <summary className="cursor-pointer text-slate-400 hover:text-white font-medium">
                  View Direct Swap Matrix (OUT ➔ IN)
                </summary>
                <div className="mt-1.5 space-y-1">
                  {wc.transferDelta.directSwaps.map((s: any, idx: number) => (
                    <div key={idx} className="p-1 rounded bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                      <div className="truncate pr-1">
                        <span className="text-rose-400 font-semibold">OUT: {s.outPlayer.name} ({s.outPlayer.team}, £{s.outPlayer.cost}m)</span>
                        <span className="text-slate-500 mx-1">➔</span>
                        <span className="text-emerald-400 font-semibold">IN: {s.inPlayer.name} ({s.inPlayer.team}, £{s.inPlayer.cost}m)</span>
                      </div>
                      <span className={`font-mono text-[9px] shrink-0 ${s.financialDelta > 0 ? 'text-amber-400' : 'text-cyan-400'}`}>
                        {s.financialDelta > 0 ? `+£${s.financialDelta}m` : `-£${Math.abs(s.financialDelta)}m`}
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Optimal 15-Man Squad */}
        <div className="space-y-2 pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold text-white">
            <span className="flex items-center gap-1 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Optimal 15-Man Wildcard Template
            </span>
            <span className="font-mono text-slate-400">
              Cost: £{wc.optimalSquad.totalCost}m | Bank: £{wc.optimalSquad.bankRemaining}m
            </span>
          </div>

          <div className="space-y-2 bg-slate-950 p-3 rounded-lg border border-slate-800/80">
            {/* Goalkeepers */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Goalkeepers</div>
              <div className="grid grid-cols-2 gap-1.5">
                {wc.optimalSquad.gks.map((p) => (
                  <div key={p.code} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                    <div>
                      <span className="font-bold text-white">{p.name}</span>{' '}
                      <span className="text-[10px] text-slate-400">({p.team})</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold">£{p.cost}m</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Defenders */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Defenders</div>
              <div className="grid grid-cols-2 gap-1.5">
                {wc.optimalSquad.defs.map((p) => (
                  <div key={p.code} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                    <div className="truncate pr-1">
                      <span className="font-bold text-white">{p.name}</span>{' '}
                      <span className="text-[10px] text-slate-400">({p.team})</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold shrink-0">£{p.cost}m</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Midfielders */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Midfielders</div>
              <div className="grid grid-cols-2 gap-1.5">
                {wc.optimalSquad.mids.map((p) => (
                  <div key={p.code} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                    <div className="truncate pr-1">
                      <span className="font-bold text-white">{p.name}</span>{' '}
                      <span className="text-[10px] text-slate-400">({p.team})</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold shrink-0">£{p.cost}m</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Forwards */}
            <div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Forwards</div>
              <div className="grid grid-cols-2 gap-1.5">
                {wc.optimalSquad.fwds.map((p) => (
                  <div key={p.code} className="p-1.5 rounded bg-slate-900 border border-slate-800 flex justify-between items-center text-[11px]">
                    <div className="truncate pr-1">
                      <span className="font-bold text-white">{p.name}</span>{' '}
                      <span className="text-[10px] text-slate-400">({p.team})</span>
                    </div>
                    <span className="font-mono text-emerald-400 font-bold shrink-0">£{p.cost}m</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Targeted Fixture Swings */}
        <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-900/50 space-y-1">
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Targeted Fixture Swings</div>
          <ul className="text-[10px] text-slate-300 space-y-0.5 list-disc pl-3">
            {wc.keyFixtureSwings.map((swing, idx) => (
              <li key={idx}>{swing}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  // 2. CLASSIC SQUAD AUDIT CARD
  if (card.type === 'SQUAD_AUDIT') {
    const audit = card as SquadAuditCard;

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-lg space-y-3">
        {/* Header & Overall Score */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
            <Zap className="w-4 h-4 text-emerald-400" />
            Squad Audit (GW{audit.gameweek})
          </div>
          <div className="flex items-center gap-1.5">
            {typeof audit.freeTransfers === 'number' && (
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                  audit.freeTransfers === 0
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                }`}
              >
                {audit.freeTransfers} FT Available
              </span>
            )}
            <div className="flex items-center gap-1">
              <span className="text-slate-400 text-[10px]">Score:</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-bold">
                {audit.squadScore}/100
              </span>
            </div>
          </div>
        </div>

        {/* 0 Free Transfers Notice */}
        {audit.freeTransfers === 0 && (
          <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300">0 Free Transfers Remaining:</span> Any transfers made this gameweek will cost a <strong>-4 point hit</strong>. We recommend holding your team to bank 1 Free Transfer for next gameweek unless injury demands an urgent move.
            </div>
          </div>
        )}

        {/* Transfer Recommendations */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Recommended Transfer (Bayesian EV):
          </div>
          {audit.transfers.map((tx, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-rose-400 flex items-center gap-1">
                  <ArrowDownRight className="w-3.5 h-3.5" />
                  OUT: {tx.playerOut.name} (£{tx.playerOut.cost}m)
                </span>
                <span className="text-emerald-400 flex items-center gap-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  IN: {tx.playerIn.name} (£{tx.playerIn.cost}m)
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span className="truncate pr-2">{tx.playerOut.reason}</span>
                <span className="text-emerald-400 font-mono shrink-0">+{tx.playerIn.projectedXpDelta} xP Expected</span>
              </div>
            </div>
          ))}
        </div>

        {/* Captaincy EV */}
        <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-1">
          <div className="flex items-center justify-between font-bold text-emerald-400">
            <span className="flex items-center gap-1">
              <Award className="w-4 h-4" />
              Captain Pick: {audit.captaincy.captain.name}
            </span>
            <div className="font-mono text-emerald-300 font-bold">{audit.captaincy.captain.projectedXp} xP</div>
          </div>
          <div className="text-[11px] text-slate-300">{audit.captaincy.captain.rationale}</div>
          <div className="text-[10px] text-slate-400">
            Vice: {audit.captaincy.viceCaptain.name} ({audit.captaincy.viceCaptain.projectedXp} xP)
          </div>
        </div>

        {/* Optimal XI Preview */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Optimal Starting XI:
            </span>
            {audit.formation && (
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                Formation: {audit.formation}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {audit.optimalStartingXI.map((name, idx) => {
              const isCap = name === audit.captaincy?.captain?.name;
              const isVc = name === audit.captaincy?.viceCaptain?.name;
              return (
                <span
                  key={idx}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                    isCap
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 font-bold'
                      : isVc
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 font-bold'
                      : 'bg-slate-950 text-slate-300 border-slate-800'
                  }`}
                >
                  {name}
                  {isCap && <span className="text-[9px] text-amber-400 font-black">(C)</span>}
                  {isVc && <span className="text-[9px] text-sky-400 font-black">(V)</span>}
                </span>
              );
            })}
          </div>
        </div>

        {/* Bench Order Preview */}
        {audit.benchOrder && audit.benchOrder.length > 0 && (
          <div className="space-y-1 pt-1 border-t border-slate-800/80">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Bench Priority (Sub Order):
            </div>
            <div className="flex flex-wrap gap-1">
              {audit.benchOrder.map((name, idx) => (
                <span
                  key={idx}
                  className="px-1.5 py-0.5 rounded bg-slate-950/60 text-slate-400 text-[10px] border border-slate-800 flex items-center gap-1"
                >
                  <span className="text-slate-500 text-[9px] font-mono">
                    {idx === 0 ? 'GK' : `#${idx}`}:
                  </span>
                  <span>{name}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. DYNAMIC CAPTAINCY EV MATRIX
  if (card.type === 'CAPTAINCY_EV_MATRIX') {
    const matrix = card as CaptaincyEvMatrixCard;
    const [strategyMode, setStrategyMode] = useState<'protect' | 'balanced' | 'chase'>('balanced');
    const [rankTier, setRankTier] = useState<'top100k' | 'top10k' | 'overall'>('top100k');

    // Sort candidates according to active strategy
    const sortedCandidates = [...matrix.candidates].sort((a, b) => {
      if (strategyMode === 'protect') return b.dynamicEv.protectRankEv - a.dynamicEv.protectRankEv;
      if (strategyMode === 'chase') return b.dynamicEv.chaseRankEv - a.dynamicEv.chaseRankEv;
      return b.dynamicEv.balancedEv - a.dynamicEv.balancedEv;
    });

    const getRiskBadge = (profile: string) => {
      switch (profile) {
        case 'SAFE_TEMPLATE_SHIELD':
          return (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              🛡️ Safe Shield
            </span>
          );
        case 'CALCULATED_DIFFERENTIAL':
          return (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              ⚡ Differential
            </span>
          );
        default:
          return (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              💣 Risky Punt
            </span>
          );
      }
    };

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-400 to-yellow-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-amber-500/20">
              👑
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Dynamic EV Engine</div>
              <div className="font-black text-sm tracking-tight text-white">Captaincy Expected Value Matrix</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 font-mono">
            GW{matrix.gameweek} Matrix
          </span>
        </div>

        {/* Strategy Mode & Rank Tier Toggle */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Decision Strategy</span>
            <div className="flex items-center gap-1 font-mono text-[9px]">
              <button
                onClick={() => setRankTier('top10k')}
                className={`px-1.5 py-0.5 rounded ${rankTier === 'top10k' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Top 10k
              </button>
              <span>•</span>
              <button
                onClick={() => setRankTier('top100k')}
                className={`px-1.5 py-0.5 rounded ${rankTier === 'top100k' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Top 100k
              </button>
              <span>•</span>
              <button
                onClick={() => setRankTier('overall')}
                className={`px-1.5 py-0.5 rounded ${rankTier === 'overall' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Overall
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setStrategyMode('protect')}
              className={`py-1 px-2 rounded text-[10px] font-bold transition-all ${
                strategyMode === 'protect'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Prioritizes covering high-EO template captains to prevent rank drops"
            >
              🛡️ Protect Rank
            </button>
            <button
              onClick={() => setStrategyMode('balanced')}
              className={`py-1 px-2 rounded text-[10px] font-bold transition-all ${
                strategyMode === 'balanced'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Balances Bayesian floor and ceiling"
            >
              ⚖️ Balanced EV
            </button>
            <button
              onClick={() => setStrategyMode('chase')}
              className={`py-1 px-2 rounded text-[10px] font-bold transition-all ${
                strategyMode === 'chase'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Maximizes rank gain multiplier per goal against low effective ownership"
            >
              ⚔️ Chase Rank
            </button>
          </div>
        </div>

        {/* Hero Safe vs Differential Pick Showcase */}
        <div className="grid grid-cols-2 gap-2">
          {/* Top Safe Shield */}
          <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-800/40 space-y-1">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
              <span>🛡️ Safe Template Pick</span>
              <span className="font-mono text-[9px] text-emerald-400/80">{matrix.topSafePick.eoTop100k}% EO</span>
            </div>
            <div className="text-xs font-black text-white flex items-center justify-between">
              <span>{matrix.topSafePick.name} ({matrix.topSafePick.team})</span>
              <span className="font-mono text-emerald-300">{matrix.topSafePick.projectedXp} xP</span>
            </div>
            <p className="text-[9px] text-slate-300 leading-snug">{matrix.topSafePick.rationale}</p>
          </div>

          {/* Top Differential Sword */}
          <div className="p-2.5 rounded-lg bg-cyan-950/20 border border-cyan-800/40 space-y-1">
            <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center justify-between">
              <span>⚔️ Top Differential Pick</span>
              <span className="font-mono text-[9px] text-cyan-400/80">{matrix.topDifferentialPick.eoTop100k}% EO</span>
            </div>
            <div className="text-xs font-black text-white flex items-center justify-between">
              <span>{matrix.topDifferentialPick.name} ({matrix.topDifferentialPick.team})</span>
              <span className="font-mono text-cyan-300">{matrix.topDifferentialPick.projectedXp} xP</span>
            </div>
            <p className="text-[9px] text-slate-300 leading-snug">{matrix.topDifferentialPick.rationale}</p>
          </div>
        </div>

        {/* Dynamic EV Candidates Matrix Table */}
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Candidate Matrix & Opponent Venue History</span>
            <span className="text-[9px] text-slate-500">Sorted by: {strategyMode.toUpperCase()} EV</span>
          </div>

          <div className="space-y-2">
            {sortedCandidates.map((c) => {
              const activeEv =
                strategyMode === 'protect'
                  ? c.dynamicEv.protectRankEv
                  : strategyMode === 'chase'
                  ? c.dynamicEv.chaseRankEv
                  : c.dynamicEv.balancedEv;

              const eoVal =
                rankTier === 'top10k'
                  ? c.effectiveOwnership.top10k
                  : rankTier === 'overall'
                  ? c.effectiveOwnership.overall
                  : c.effectiveOwnership.top100k;

              return (
                <div
                  key={c.id}
                  className="p-3 rounded-lg bg-slate-950 border border-slate-800/90 space-y-2 hover:border-slate-700 transition-all"
                >
                  {/* Name, Opponent & Dynamic EV */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-black text-white text-xs flex items-center gap-1.5">
                        <span>{c.name}</span>
                        <span className="text-[10px] font-normal text-slate-400">({c.team} • {c.position})</span>
                        {getRiskBadge(c.riskProfile)}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="font-semibold text-slate-300">vs {c.fixture}</span>
                        <span>•</span>
                        <span className="text-slate-500">{c.opponentDefensiveRating.stadium}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[9px] text-slate-500 uppercase font-bold">Dynamic EV</div>
                      <div className="font-mono font-black text-sm text-amber-400">{activeEv}</div>
                    </div>
                  </div>

                  {/* Opponent Defensive Vulnerability Bar */}
                  <div className="p-2 rounded bg-slate-900/80 border border-slate-800/60 text-[10px] grid grid-cols-4 gap-1 text-center">
                    <div>
                      <div className="text-slate-500 text-[9px] uppercase">Base xP</div>
                      <div className="font-mono font-bold text-white text-[11px]">{c.baseXp}</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[9px] uppercase">Bracket EO</div>
                      <div className="font-mono font-bold text-cyan-400 text-[11px]">{eoVal}%</div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[9px] uppercase">Opp Concedes</div>
                      <div className="font-mono font-bold text-rose-400 text-[11px]">
                        {c.opponentDefensiveRating.avgGoalsConceded} g/m
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-500 text-[9px] uppercase">Opp Clean %</div>
                      <div className="font-mono font-bold text-slate-300 text-[11px]">
                        {Math.round(c.opponentDefensiveRating.cleanSheetRate * 100)}%
                      </div>
                    </div>
                  </div>

                  {/* Shield vs Sword Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] pt-0.5">
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-emerald-950/20 border border-emerald-900/40">
                      <span className="text-emerald-400 font-semibold">🛡️ Shield Score:</span>
                      <span className="font-mono font-bold text-emerald-300">{c.shieldScore}/100</span>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1 rounded bg-cyan-950/20 border border-cyan-900/40">
                      <span className="text-cyan-400 font-semibold">⚔️ Sword Score:</span>
                      <span className="font-mono font-bold text-cyan-300">{c.swordScore}/100</span>
                    </div>
                  </div>

                  {/* Tactical Recommendation */}
                  <p className="text-[10px] text-slate-300 leading-snug pt-1 border-t border-slate-900">
                    {c.recommendationVerdict}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Executive Strategic Summary */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-slate-950 to-slate-900 border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
            <span>⚡</span> Strategic Captaincy Verdict
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            {matrix.executiveVerdict}
          </p>
        </div>
      </div>
    );
  }

  // 5. TRANSFER HORIZON & MINI-WILDCARD OPTIMIZER
  if (card.type === 'TRANSFER_HORIZON') {
    const horizon = card as TransferHorizonCard;
    const [simulatedFt, setSimulatedFt] = useState<number>(horizon.currentFreeTransfers);

    // Calculate dynamic unlock gameweek if simulatedFt changed
    const dynamicUnlockGw =
      simulatedFt >= 3
        ? horizon.gameweek + 1
        : simulatedFt === 2
        ? horizon.gameweek + 1
        : horizon.gameweek + 2;

    const dynamicHitPointsSaved = 4 * (horizon.miniWildcardPackage.requiredTransfers - 1);

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-cyan-500/20">
              🔄
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Transfer Horizon Solver
              </div>
              <div className="font-black text-sm tracking-tight text-white">
                5-FT Rollover & Mini-Wildcard
              </div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
            GW{horizon.gameweek} Path
          </span>
        </div>

        {/* 5-Free-Transfer Rollover Progress Bar & Simulator */}
        <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800/80 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Banked Free Transfers (5 Max)
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((ft) => (
                <button
                  key={ft}
                  onClick={() => setSimulatedFt(ft)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-all ${
                    simulatedFt === ft
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                  title={`Simulate starting with ${ft} Free Transfers`}
                >
                  {ft} FT
                </button>
              ))}
            </div>
          </div>

          {/* 5-segment bank bar */}
          <div className="grid grid-cols-5 gap-1.5 pt-0.5">
            {[1, 2, 3, 4, 5].map((slot) => {
              const isFilled = slot <= simulatedFt;
              return (
                <div
                  key={slot}
                  className={`h-2 rounded-full transition-all ${
                    isFilled
                      ? 'bg-gradient-to-r from-cyan-400 to-blue-500 shadow-sm shadow-cyan-500/50'
                      : 'bg-slate-800/60 border border-slate-800'
                  }`}
                />
              );
            })}
          </div>
          <div className="flex justify-between text-[9px] text-slate-500 font-mono">
            <span>Current: {simulatedFt} FT</span>
            <span>Max Cap: 5 Banked FTs</span>
          </div>
        </div>

        {/* Mini-Wildcard Unlock Hero Banner */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-950/60 via-purple-950/40 to-slate-950 border border-indigo-500/30 shadow-lg space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">🎯</span>
              <span className="text-xs font-black text-white">
                Mini-Wildcard Unlocks in GW{dynamicUnlockGw}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              0 Hits Taken
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-indigo-900/40 text-center font-mono">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans">Swaps Unlocked</div>
              <div className="text-sm font-black text-cyan-400">
                {horizon.miniWildcardPackage.requiredTransfers} Players
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans">Hit Points Saved</div>
              <div className="text-sm font-black text-emerald-400">
                +{dynamicHitPointsSaved} pts
              </div>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800">
              <div className="text-[9px] text-slate-400 font-sans">Net Proj xP Gain</div>
              <div className="text-sm font-black text-purple-400">
                +{horizon.totalProjectedXpGain} xP
              </div>
            </div>
          </div>
        </div>

        {/* Club Fixture Swing Pivot */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Club Fixture Swing Divergence</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
              {horizon.swingPivot.swingRating} SWING
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Exit Club */}
            <div className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1">
                  <span>🔴</span> EXIT: {horizon.swingPivot.exitClub.name}
                </span>
                <span className="text-[9px] font-mono font-bold text-rose-300">
                  FDR {horizon.swingPivot.exitClub.fdrNext3}
                </span>
              </div>
              <div className="text-[10px] text-slate-300 leading-snug">
                {horizon.swingPivot.exitClub.brutalRunDescription}
              </div>
            </div>

            {/* Entry Club */}
            <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-900/50 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                  <span>🟢</span> ENTRY: {horizon.swingPivot.entryClub.name}
                </span>
                <span className="text-[9px] font-mono font-bold text-emerald-300">
                  FDR {horizon.swingPivot.entryClub.fdrNext3}
                </span>
              </div>
              <div className="text-[10px] text-slate-300 leading-snug">
                {horizon.swingPivot.entryClub.greenRunDescription}
              </div>
            </div>
          </div>
        </div>

        {/* Proposed Mini-Wildcard Swaps Package */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            <span>{horizon.miniWildcardPackage.title}</span>
            <span className="text-[9px] font-mono text-slate-400">
              Cost: £{horizon.miniWildcardPackage.totalCostDelta >= 0 ? '+' : ''}
              {horizon.miniWildcardPackage.totalCostDelta}m • Bank: £
              {horizon.miniWildcardPackage.bankRemaining}m
            </span>
          </div>

          <div className="space-y-1.5">
            {horizon.miniWildcardPackage.swaps.map((swap, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/90 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  {/* OUT */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      OUT
                    </span>
                    <span className="font-bold text-white text-[11px]">{swap.outPlayer.name}</span>
                    <span className="text-[10px] text-slate-400">
                      ({swap.outPlayer.team}, £{swap.outPlayer.cost}m)
                    </span>
                  </div>

                  <span className="text-slate-500 font-bold">➔</span>

                  {/* IN */}
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      IN
                    </span>
                    <span className="font-bold text-emerald-300 text-[11px]">
                      {swap.inPlayer.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      ({swap.inPlayer.team}, £{swap.inPlayer.cost}m)
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[9px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <span className="text-rose-400/90 truncate max-w-[45%]">
                    {swap.outPlayer.reason}
                  </span>
                  <span className="text-emerald-400 font-mono font-bold">
                    +{swap.xpGain} xP Gain (FDR {swap.inPlayer.upcomingFdrAvg})
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4-Gameweek Horizon Timeline */}
        <div className="space-y-1.5">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            4-Gameweek Strategic Roadmap
          </div>
          <div className="space-y-1.5">
            {horizon.horizonTimeline.map((step, idx) => {
              const isExecute = step.actionType === 'EXECUTE_MINI_WILDCARD';
              return (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-[11px] ${
                    isExecute
                      ? 'bg-indigo-950/40 border-indigo-500/40 text-white'
                      : 'bg-slate-950/40 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-slate-400">GW{step.gameweek}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                          isExecute
                            ? 'bg-indigo-500 text-slate-950 font-black'
                            : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {step.actionType === 'EXECUTE_MINI_WILDCARD'
                          ? '🚀 EXECUTE MINI-WILDCARD'
                          : step.actionType === 'ROLL'
                          ? '🔄 ROLL FT'
                          : 'HOLD / ROLL'}
                      </span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">
                      Bank: {step.availableFt} FT ➔ {step.ftAfterAction} FT
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 font-medium">
                    {step.actionSummary}
                  </div>
                  <div className="text-[9px] text-slate-500 mt-0.5">
                    💡 {step.notes}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Executive Verdict */}
        <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-800/50 space-y-1">
          <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
            <span>⚡</span> Rollover Strategy Verdict
          </div>
          <p className="text-[10px] text-slate-300 leading-relaxed">
            {horizon.strategicVerdict}
          </p>
        </div>
      </div>
    );
  }

  // 5. PLAYER COMPARISON
  if (card.type === 'PLAYER_COMPARISON') {
    const comp = card as PlayerComparisonCard;
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Player Lab: YoY & 5-GW Matrix
          </div>
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
            Top Pick: {comp.winner}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {comp.players.map((p, idx) => (
            <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <div className="font-bold text-white flex items-center justify-between">
                <span>{p.name}</span>
                <span className="text-slate-400 font-mono">£{p.currentCost}m</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">26/27 xGI/90:</span>
                  <span className="font-mono text-emerald-400">{p.live26FormXgi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">3-Yr Vaastav xGI:</span>
                  <span className="font-mono text-cyan-400">{p.historicalPer90Xgi}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Next 5 FDR Avg:</span>
                  <span className="font-mono">{p.upcoming5GwFdrAvg}</span>
                </div>
              </div>
              <div className="text-[10px] text-slate-400 italic pt-1 border-t border-slate-900">{p.verdict}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 6. MATCHUP EVALUATION
  if (card.type === 'MATCHUP_EVALUATION') {
    const match = card as MatchupEvaluationCard;
    const hasData = match.hasH2hData !== false && (match.h2hMeetingsCount === undefined || match.h2hMeetingsCount > 0);

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-lg space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5 font-bold text-white text-sm">
            <Shield className="w-4 h-4 text-purple-400" />
            {match.matchup} ({match.venue})
          </div>
          {hasData ? (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30">
              {match.h2hMeetingsCount || 6} Recent Meetings
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              Promoted / No Recent H2H
            </span>
          )}
        </div>

        {/* No H2H Data Alert for Promoted / Unmet Teams */}
        {!hasData && (
          <div className="p-2.5 rounded-lg bg-amber-950/20 border border-amber-800/40 text-amber-300 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">No Recent Head-to-Head Data in Vaastav 3-Year Archive</div>
              <div className="text-[10px] text-amber-200/80 mt-0.5">
                These clubs have not faced each other in the top-flight Premier League over the last 3 seasons (e.g. promoted tier). No synthetic data is fabricated. Projections rely strictly on current season form and stadium profiles.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <div className="text-slate-400">Projection Context</div>
            <div className="font-bold text-white">{match.predictedOutcome}</div>
          </div>
          <div className="p-2 rounded bg-slate-950 border border-slate-800">
            <div className="text-slate-400">Expected Total Goals</div>
            <div className="font-mono font-bold text-emerald-400">{match.expectedGoalsTotal}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase">
            {hasData ? 'Historical H2H & Venue Bias' : 'Matchup Assessment & Venue Context'}
          </div>
          <div className="text-[11px] text-slate-300">{match.historicalH2HSummary}</div>
          <div className="text-[10px] text-slate-400">{match.tacticalSummary}</div>
        </div>

        {/* Key Asset Recommendations */}
        {match.fplAssetRecommendations && (
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Targeted Assets</div>
            <div className="flex flex-wrap gap-1.5">
              {match.fplAssetRecommendations.mustStart?.map((player, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  ★ Start: {player}
                </span>
              ))}
              {match.fplAssetRecommendations.differentials?.map((player, idx) => (
                <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                  ⚡ Differential: {player}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 7. CHIP ROADMAP CARD
  if (card.type === 'CHIP_ROADMAP') {
    const rm = card as any;
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-purple-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-purple-500/20">
              🎯
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Season Strategy</div>
              <div className="font-black text-sm tracking-tight text-white">Full Chip Roadmap</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
            GW{rm.currentGameweek} Status
          </span>
        </div>

        {/* Deadline Notice Banner */}
        {rm.set1DeadlineNotice && (
          <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div>{rm.set1DeadlineNotice}</div>
          </div>
        )}

        {/* Chip Status Bar - Set 1 (Active) */}
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex justify-between">
            <span>Set 1 Chips (GW1–19 • Pre-Jan)</span>
            <span className="text-emerald-400 font-bold">ALL 4 AVAILABLE</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {(rm.set1Chips || rm.chipsStatus).map((c: any) => {
              const isAvail = c.status === 'AVAILABLE';
              return (
                <div
                  key={c.name}
                  className={`p-2 rounded-lg border text-center transition-all ${
                    isAvail
                      ? 'bg-slate-950/80 border-emerald-500/40 text-emerald-300'
                      : 'bg-slate-950/40 border-slate-800 text-slate-500'
                  }`}
                >
                  <div className="text-[9px] font-bold truncate">{c.label}</div>
                  <div className="text-[10px] font-black mt-0.5">
                    {isAvail ? 'AVAILABLE' : `USED (GW${c.playedGameweek || '-'})`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Set 2 Preview (Post-Jan) */}
        <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
          <div className="flex justify-between items-center text-[10px]">
            <span className="font-bold text-slate-400">Set 2 Chips (GW20–38 • Unlocks January)</span>
            <span className="text-slate-500 font-medium">4 Fresh Chips (WC2, FH2, TC2, BB2)</span>
          </div>
        </div>

        {/* Immediate Advice Banner */}
        <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-purple-200 text-[11px] leading-relaxed flex items-start gap-2">
          <span className="text-base">💡</span>
          <div>
            <span className="font-bold text-white">Immediate Focus: </span>
            {rm.immediateAction}
          </div>
        </div>

        {/* Detailed Chip Action Plans */}
        <div className="space-y-3 pt-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Gameweek-by-Gameweek Deployment Plan
          </div>

          {rm.seasonRoadmap.map((plan: any) => {
            const isAvail = plan.status === 'AVAILABLE';
            return (
              <div
                key={plan.chip}
                className={`p-3 rounded-lg border space-y-2 transition-all ${
                  isAvail
                    ? 'bg-slate-950 border-slate-800/90 hover:border-slate-700'
                    : 'bg-slate-950/40 border-slate-900 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span className="text-amber-400">⚡</span>
                    <span>{plan.label}</span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                      isAvail
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                        : 'bg-slate-900 text-slate-500 border-slate-800'
                    }`}
                  >
                    Target: {plan.targetWindow}
                  </span>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed bg-slate-900/50 p-2 rounded border border-slate-800/60">
                  {plan.tacticalRationale}
                </p>

                {isAvail && (
                  <div className="space-y-1 pt-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Preparation Instructions:
                    </div>
                    <ul className="text-[10px] text-slate-300 space-y-0.5 list-disc pl-3">
                      {plan.howToExecute.map((step: string, i: number) => (
                        <li key={i}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 8. EXPERT INTEL CARD
  if (card.type === 'EXPERT_INTEL') {
    const intel = card as ExpertIntelCard;

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-500 to-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-md shadow-rose-500/20">
              🎙️
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Expert Consensus</div>
              <div className="font-black text-sm tracking-tight text-white">Scout & Creator Intelligence</div>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            GW{intel.gameweek} Intel
          </span>
        </div>

        {/* Consensus Buys & Sells Grid */}
        <div className="grid grid-cols-2 gap-2">
          {/* Consensus Buys */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span>↗</span> Consensus Buys
            </div>
            <div className="space-y-1">
              {intel.consensusBuys.map((b: any, idx: number) => (
                <div key={idx} className="p-1 rounded bg-slate-900 border border-slate-800/60">
                  <div className="flex justify-between items-center text-[10px] font-bold text-white">
                    <span>{b.player}</span>
                    <span className="text-[9px] text-emerald-400 font-mono">★ {b.mentions}x</span>
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">{b.reason}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Consensus Sells */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-1.5">
            <div className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center justify-between">
              <span>↘ Sell Intel</span>
              {intel.squadSellAlerts && intel.squadSellAlerts.length > 0 && (
                <span className="text-[9px] bg-rose-500/20 text-rose-300 px-1.5 py-0.2 rounded font-bold">
                  {intel.squadSellAlerts.length} in Squad
                </span>
              )}
            </div>

            {/* Owned Squad Sell Alerts */}
            {intel.squadSellAlerts && intel.squadSellAlerts.length > 0 && (
              <div className="space-y-1">
                <div className="text-[9px] font-bold text-rose-400 flex items-center gap-1">
                  <span>🚨</span> In Your Squad:
                </div>
                {intel.squadSellAlerts.map((s: any, idx: number) => (
                  <div key={idx} className="p-1.5 rounded bg-rose-950/40 border border-rose-800/60">
                    <div className="flex justify-between items-center text-[10px] font-bold text-white">
                      <span className="text-rose-300">{s.player}</span>
                      <span className="text-[9px] text-rose-400 font-mono">⚠ {s.mentions}x</span>
                    </div>
                    <div className="text-[9px] text-slate-300 mt-0.5">{s.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Market Watch (Not Owned) */}
            <div className="space-y-1 pt-1">
              <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1">
                <span>🌐</span> Market Watch (Not in Squad):
              </div>
              {(intel.marketWatchSells || intel.consensusSells).map((s: any, idx: number) => (
                <div key={idx} className="p-1 rounded bg-slate-900 border border-slate-800/60 opacity-80">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-300">
                    <span>{s.player}</span>
                    <span className="text-[8px] text-slate-500 font-normal">[Not Owned]</span>
                  </div>
                  <div className="text-[9px] text-slate-400 truncate">{s.reason}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Captaincy Consensus */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
          <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider flex items-center justify-between">
            <span>Captaincy Verdict</span>
            <span className="text-[9px] text-slate-400 font-normal">Scout & Creator Poll</span>
          </div>
          <div className="text-[11px] font-bold text-white flex items-center gap-2">
            <span>Top Pick: <strong className="text-emerald-400">{intel.captaincyConsensus.favorite}</strong></span>
            <span>•</span>
            <span>Differential: <strong className="text-cyan-400">{intel.captaincyConsensus.differential}</strong></span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">{intel.captaincyConsensus.rationale}</p>
        </div>

        {/* Wildcard / Chip Consensus */}
        <div className="p-2.5 rounded-lg bg-indigo-950/20 border border-indigo-800/30 space-y-1 text-[11px]">
          <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
            Chip Timing Consensus
          </div>
          <p className="text-slate-300 leading-relaxed text-[10px]">
            <span className="font-bold text-white">Wildcard: </span>{intel.chipConsensus.wildcard}
          </p>
          <p className="text-slate-300 leading-relaxed text-[10px]">
            <span className="font-bold text-white">Free Hit: </span>{intel.chipConsensus.freeHit}
          </p>
        </div>

        {/* Creator-by-Creator Transcripts Breakdown */}
        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            Latest Creator Video Transcripts (Transcribed Post-Deadline)
          </div>
          <div className="space-y-1.5">
            {intel.creatorBreakdowns.map((c: any, idx: number) => (
              <a
                key={idx}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-2 rounded-lg bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition-all text-[11px]"
              >
                <div className="flex items-center justify-between font-bold text-white mb-0.5">
                  <span className="text-red-400 flex items-center gap-1">
                    <span>▶</span> {c.creator}
                  </span>
                  <span className="text-[9px] text-slate-500 font-mono">Watch Video ↗</span>
                </div>
                <div className="text-[10px] text-slate-300 leading-snug">{c.keyVerdict}</div>
                {c.topPick && (
                  <div className="text-[9px] text-emerald-400 font-semibold mt-1">
                    Top Pick: {c.topPick}
                  </div>
                )}
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 10. BOGEY GROUND CURSE MATRIX CARD
  if (card.type === 'BOGEY_GROUND_MATRIX') {
    const bogey = card as BogeyMatrixCard;
    const [filter, setFilter] = useState<'ALL' | 'BOGEY' | 'BULLY' | 'FORTRESS'>('ALL');

    const filtered = bogey.fixtures.filter((f) => {
      if (filter === 'BOGEY') return f.modifierType === 'BOGEY_GROUND_CURSE';
      if (filter === 'BULLY') return f.modifierType === 'FLAT_TRACK_BULLY';
      if (filter === 'FORTRESS') return f.modifierType === 'GROUND_FORTRESS';
      return true;
    });

    return (
      <div className="rounded-xl border border-purple-900/60 bg-slate-900/95 p-4 text-xs shadow-xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md shadow-purple-500/20">
              <Ghost className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                Bogey Team & Ground Curse Matrix
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono">GW{bogey.gameweek}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Vaastav Multi-Season Tactical Modifiers & Adjusted FDR
              </div>
            </div>
          </div>
        </div>

        {/* Counts summary pills */}
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="p-2 rounded-lg bg-purple-950/30 border border-purple-800/40">
            <div className="text-base font-black text-purple-300">{bogey.bogeyCount}</div>
            <div className="text-[9px] text-purple-400 font-semibold uppercase">👻 Bogey Curses</div>
          </div>
          <div className="p-2 rounded-lg bg-amber-950/30 border border-amber-800/40">
            <div className="text-base font-black text-amber-300">{bogey.flatTrackCount}</div>
            <div className="text-[9px] text-amber-400 font-semibold uppercase">🔨 Flat-Track Bullies</div>
          </div>
          <div className="p-2 rounded-lg bg-blue-950/30 border border-blue-800/40">
            <div className="text-base font-black text-blue-300">{bogey.fortressCount}</div>
            <div className="text-[9px] text-blue-400 font-semibold uppercase">🏰 Home Fortresses</div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex rounded-lg bg-slate-950 p-0.5 text-[10px] font-semibold border border-slate-800">
          {(['ALL', 'BOGEY', 'BULLY', 'FORTRESS'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 py-1 rounded transition-all ${
                filter === tab
                  ? 'bg-purple-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'ALL' && 'All Matches'}
              {tab === 'BOGEY' && '👻 Curses'}
              {tab === 'BULLY' && '🔨 Bullies'}
              {tab === 'FORTRESS' && '🏰 Fortresses'}
            </button>
          ))}
        </div>

        {/* Fixtures List */}
        <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
          {filtered.map((item) => {
            const isBogey = item.modifierType === 'BOGEY_GROUND_CURSE';
            const isBully = item.modifierType === 'FLAT_TRACK_BULLY';
            const isFortress = item.modifierType === 'GROUND_FORTRESS';

            return (
              <div
                key={item.fixtureId}
                className={`p-3 rounded-xl border space-y-2 transition-all ${
                  isBogey
                    ? 'bg-purple-950/20 border-purple-800/50'
                    : isBully
                    ? 'bg-amber-950/20 border-amber-800/50'
                    : isFortress
                    ? 'bg-blue-950/20 border-blue-800/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                {/* Match Title & Badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-extrabold text-white text-xs">
                      {item.homeTeam} <span className="text-slate-500">vs</span> {item.awayTeam}
                    </span>
                    <div className="text-[9px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <span>🏟️ {item.stadiumName}</span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                      isBogey
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : isBully
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : isFortress
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badgeLabel}
                  </span>
                </div>

                {/* FDR Contrast: Official FPL vs Multi-Year Adjusted */}
                <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[10px]">
                  <div>
                    <div className="text-slate-500 uppercase text-[9px] font-bold">Official FPL FDR</div>
                    <div className="font-bold text-slate-300">
                      {item.homeShort}: {item.officialFdrHome} • {item.awayShort}: {item.officialFdrAway}
                    </div>
                  </div>
                  <div>
                    <div className="text-purple-400 uppercase text-[9px] font-bold">Historical Adjusted FDR</div>
                    <div className="font-bold text-white flex items-center gap-1">
                      <span>{item.homeShort}: {item.adjustedFdrHome}</span>
                      <span>•</span>
                      <span className={item.adjustedFdrAway > item.officialFdrAway ? 'text-rose-400 font-extrabold' : 'text-emerald-400'}>
                        {item.awayShort}: {item.adjustedFdrAway}
                        {item.adjustedFdrAway > item.officialFdrAway && ' ⚠️'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* H2H Historical Record */}
                <div className="text-[10px] text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between font-medium">
                    <span className="text-slate-400">Past 5 Meetings at Venue:</span>
                    <span className="font-bold text-white">{item.h2hSummary.last5Meetings}</span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] text-slate-400">
                    <span>Away Clean Sheet Rate: <strong className="text-white">{Math.round(item.h2hSummary.cleanSheetRateAway * 100)}%</strong></span>
                    <span>Favored Win Rate: <strong className="text-white">{Math.round(item.h2hSummary.favoredTeamWinRate * 100)}%</strong></span>
                  </div>
                </div>

                {/* Affected Assets & Tactical Advice */}
                <div className="space-y-1 text-[10px]">
                  {item.affectedTopAssets && item.affectedTopAssets.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-slate-500 font-bold uppercase">Key Assets:</span>
                      {item.affectedTopAssets.map((asset, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-slate-800 text-emerald-300 font-semibold text-[9px] border border-slate-700/60">
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.injuredStars && item.injuredStars.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[9px] text-rose-500 font-bold uppercase">⚠️ Ruled Out:</span>
                      {item.injuredStars.map((asset, i) => (
                        <span key={i} className="px-1.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/60 line-through text-[9px]">
                          {asset}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-slate-300 leading-relaxed italic text-[10px] border-l-2 border-purple-500/60 pl-2">
                    {item.tacticalFplAdvice}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Executive Tactical Summary */}
        <div className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-[10px] text-slate-300 leading-relaxed">
          <span className="font-bold text-purple-400 uppercase tracking-wider block mb-0.5">
            Tactical Advisory
          </span>
          {bogey.executiveSummary}
        </div>
      </div>
    );
  }

  // 11. HORIZON PLAN CARD (GW9–19 Mid-Season Roadmap)
  if (card.type === 'HORIZON_PLAN') {
    const hp = card as HorizonPlannerCard;

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-slate-950 text-sm shadow-md shadow-cyan-500/20">
              🗓️
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mid-Season Roadmap</div>
              <div className="font-black text-sm tracking-tight text-white">GW{hp.currentGameweek}–GW{hp.horizonEndGameweek} Master Plan</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono">
            +{hp.totalProjectedHorizonXp} Projected xP
          </span>
        </div>

        {/* Dynamic Recalibration Triggers Banner */}
        {hp.recalibrationTriggers && hp.recalibrationTriggers.length > 0 && (
          <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-200 text-[11px] space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-white">
              <span className="text-amber-400">⚡</span>
              <span>Dynamic Watchdog Trigger Detected</span>
            </div>
            <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-amber-200/90">
              {hp.recalibrationTriggers.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Gameweek-by-Gameweek Timeline */}
        <div className="space-y-2 pt-1">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
            <span>Gameweek Trajectory & Transfer Milestones</span>
            <span className="text-slate-500 font-normal">Last Audited: {hp.lastAudited}</span>
          </div>

          <div className="space-y-2">
            {hp.steps.map((step) => {
              const isChip = step.actionType === 'PLAY_CHIP';
              const isTransfer = step.actionType === 'MAKE_TRANSFERS';
              const isRoll = step.actionType === 'ROLL_FT';

              return (
                <div
                  key={step.gameweek}
                  className={`p-2.5 rounded-lg border transition-all ${
                    isChip
                      ? 'bg-purple-950/20 border-purple-500/40 shadow-sm shadow-purple-500/10'
                      : isTransfer
                      ? 'bg-slate-950 border-cyan-500/40'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  {/* Step Top Bar */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-[12px]">GW{step.gameweek}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({step.freeTransfersAvailable} FT)</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isChip && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">
                          🃏 {step.chipLabel || 'CHIP'}
                        </span>
                      )}
                      {isTransfer && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                          ⚡ TRANSFER
                        </span>
                      )}
                      {isRoll && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                          🔄 ROLL FT
                        </span>
                      )}
                      <span className="text-[10px] font-mono text-emerald-400 font-bold">
                        +{step.projectedPoints} xP
                      </span>
                    </div>
                  </div>

                  {/* Trajectory / Fixture Context */}
                  <p className="text-[10px] text-slate-300 leading-relaxed mb-1.5">
                    {step.fixtureTrajectorySummary}
                  </p>

                  {/* Planned Transfers */}
                  {step.transfersPlanned && step.transfersPlanned.length > 0 && (
                    <div className="p-1.5 rounded bg-slate-900 border border-slate-800/80 space-y-1 mb-1.5 text-[10px]">
                      {step.transfersPlanned.map((t, idx) => (
                        <div key={idx}>
                          <div className="flex items-center gap-1 text-white font-semibold">
                            <span className="text-rose-400">OUT: {t.outPlayer}</span>
                            <span className="text-slate-500">➔</span>
                            <span className="text-emerald-400">IN: {t.inPlayer}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 mt-0.5">{t.rationale}</div>
                          {t.priceRiskAlert && (
                            <div className="text-[9px] text-amber-300 font-medium mt-0.5 flex items-center gap-1">
                              <span>⚠️</span> {t.priceRiskAlert}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Captain Pick */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-900">
                    <div>
                      <span className="font-semibold text-white">👑 (C): </span>
                      <span className="text-amber-400 font-bold">{step.captainCandidate}</span>
                      <span className="mx-1 text-slate-600">•</span>
                      <span>(V): {step.viceCaptainCandidate}</span>
                    </div>
                    <span className="font-mono text-slate-500 text-[9px]">
                      Cumulative: {step.runningTotalXp} xP
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // 11. PRICE CHANGE RADAR & OVERNIGHT BUDGET PROTECTOR
  if (card.type === 'PRICE_CHANGE_RADAR') {
    const radar = card as PriceChangeRadarCard;
    const [subTab, setSubTab] = useState<'squad' | 'targets' | 'market'>('squad');

    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900/95 p-4 text-xs shadow-xl space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center font-bold text-slate-950 text-sm shadow-md shadow-amber-500/20">
              📈
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Price Change Radar
              </div>
              <div className="font-bold text-sm tracking-tight text-white flex items-center gap-1.5">
                Overnight Budget Protection
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-amber-400 font-bold font-mono">
              {radar.nextPriceChangeTime}
            </div>
            <div className="text-[9px] text-slate-500">Updated {radar.lastUpdated}</div>
          </div>
        </div>

        {/* Overnight Budget Delta Impact Bar */}
        <div className="p-3 rounded-lg bg-gradient-to-r from-rose-950/40 via-slate-950 to-amber-950/30 border border-rose-800/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Overnight Net Impact
            </span>
            <span className={`font-mono text-xs font-bold ${radar.overnightBudgetDelta < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {radar.overnightBudgetDelta < 0 ? `${radar.overnightBudgetDelta.toFixed(1)}m Budget Hit` : 'Budget Protected'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-800/60">
            <div className="bg-slate-900/80 p-1.5 rounded border border-rose-900/30">
              <span className="text-slate-400 block text-[9px]">Squad Drops Tonight:</span>
              <span className="font-bold text-rose-400">{radar.squadAtRiskCount} Player(s)</span>
            </div>
            <div className="bg-slate-900/80 p-1.5 rounded border border-amber-900/30">
              <span className="text-slate-400 block text-[9px]">Targets Rising Tonight:</span>
              <span className="font-bold text-amber-300">{radar.targetsRisingCount} Target(s)</span>
            </div>
          </div>
        </div>

        {/* Actionable Advice Alerts */}
        {radar.budgetPreservationAdvice && radar.budgetPreservationAdvice.length > 0 && (
          <div className="space-y-1.5">
            {radar.budgetPreservationAdvice.map((adv, idx) => (
              <div
                key={idx}
                className="text-[10px] leading-snug p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200"
              >
                {adv}
              </div>
            ))}
          </div>
        )}

        {/* Sub-Tabs: Squad Watch vs Target Watch vs Market Watch */}
        <div className="flex border-b border-slate-800 gap-1 text-[11px] font-bold">
          <button
            onClick={() => setSubTab('squad')}
            className={`pb-1 px-2 border-b-2 transition-all ${
              subTab === 'squad'
                ? 'border-rose-400 text-rose-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Squad ({radar.squadPlayers.length})
          </button>
          <button
            onClick={() => setSubTab('targets')}
            className={`pb-1 px-2 border-b-2 transition-all ${
              subTab === 'targets'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Target Watchlist ({radar.targetedPlayers.length})
          </button>
          <button
            onClick={() => setSubTab('market')}
            className={`pb-1 px-2 border-b-2 transition-all ${
              subTab === 'market'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            PL Top Movers
          </button>
        </div>

        {/* 1. SQUAD PLAYERS LIST */}
        {subTab === 'squad' && (
          <div className="space-y-1.5">
            {radar.squadPlayers.map((p) => {
              const isDrop = p.changeProbabilityPct <= -60;
              const isRise = p.changeProbabilityPct >= 60;
              return (
                <div
                  key={p.id}
                  className={`p-2 rounded-lg bg-slate-950 border transition-all text-[11px] space-y-1 ${
                    p.status === 'IMMINENT_DROP'
                      ? 'border-rose-500/50 bg-rose-950/20 shadow-sm'
                      : 'border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.team} • {p.position})</span>
                      <span className="font-mono text-emerald-400 font-bold text-[10px]">
                        £{p.currentPrice.toFixed(1)}m
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                          isDrop
                            ? 'bg-rose-950 text-rose-300 border border-rose-800/50'
                            : isRise
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {p.changeProbabilityPct > 0 ? `+${p.changeProbabilityPct}%` : `${p.changeProbabilityPct}%`}
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        {p.ownershipPercent}% Own
                      </span>
                    </div>
                  </div>

                  {/* Urgency Alert Bar */}
                  <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-900">
                    <span className={`truncate max-w-[220px] ${p.status === 'IMMINENT_DROP' ? 'text-rose-400 font-bold' : 'text-slate-400'}`}>
                      {p.urgencyText}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 shrink-0">
                      Net: {p.netTransfersEvent > 0 ? `+${(p.netTransfersEvent / 1000).toFixed(0)}k` : `${(p.netTransfersEvent / 1000).toFixed(0)}k`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 2. TARGET WATCHLIST */}
        {subTab === 'targets' && (
          <div className="space-y-1.5">
            {radar.targetedPlayers.map((p) => {
              const isRise = p.changeProbabilityPct >= 60;
              return (
                <div
                  key={p.id}
                  className={`p-2 rounded-lg bg-slate-950 border transition-all text-[11px] space-y-1 ${
                    p.status === 'IMMINENT_RISE'
                      ? 'border-amber-500/50 bg-amber-950/20 shadow-sm'
                      : 'border-slate-800/80'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white text-xs">{p.name}</span>
                      <span className="text-[10px] text-slate-400">({p.team} • {p.position})</span>
                      <span className="font-mono text-cyan-400 font-bold text-[10px]">
                        £{p.currentPrice.toFixed(1)}m
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-bold text-[10px] px-1.5 py-0.5 rounded ${
                          isRise
                            ? 'bg-amber-950 text-amber-300 border border-amber-800/50'
                            : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        {p.changeProbabilityPct > 0 ? `+${p.changeProbabilityPct}%` : `${p.changeProbabilityPct}%`}
                      </span>
                      <span className="font-mono text-[9px] text-slate-500">
                        {p.ownershipPercent}% Own
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] pt-0.5 border-t border-slate-900">
                    <span className={`truncate max-w-[220px] ${p.status === 'IMMINENT_RISE' ? 'text-amber-300 font-bold' : 'text-slate-400'}`}>
                      {p.urgencyText}
                    </span>
                    <span className="font-mono text-[9px] text-slate-400 shrink-0">
                      Net: +{(p.transfersInEvent / 1000).toFixed(0)}k
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 3. MARKET TOP RISERS & FALLERS */}
        {subTab === 'market' && (
          <div className="space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                🔥 Top Risers Tonight
              </span>
              <div className="space-y-1">
                {radar.marketTopRisers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{p.name}</span>
                      <span className="text-slate-400">({p.team} • {p.position})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-emerald-400 font-bold">£{p.currentPrice.toFixed(1)}m</span>
                      <span className="font-mono text-emerald-300 bg-emerald-950/60 px-1 py-0.5 rounded text-[9px]">
                        +{p.changeProbabilityPct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block">
                📉 Top Fallers Tonight
              </span>
              <div className="space-y-1">
                {radar.marketTopFallers.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-1.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-white">{p.name}</span>
                      <span className="text-slate-400">({p.team} • {p.position})</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-rose-400 font-bold">£{p.currentPrice.toFixed(1)}m</span>
                      <span className="font-mono text-rose-300 bg-rose-950/60 px-1 py-0.5 rounded text-[9px]">
                        {p.changeProbabilityPct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};
