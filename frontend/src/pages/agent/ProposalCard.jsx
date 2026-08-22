import React from "react";
import { CheckCircle2, ShieldAlert, ArrowRight, Award } from "lucide-react";

export default function ProposalCard({
  proposal,
  index,
  onSelect,
  isRecommended = false,
}) {
  const { strategy, explanation, score, operations = [], warnings = [] } = proposal;

  const getStrategyBadge = (strat) => {
    switch (strat) {
      case "absence_same_slot_substitute":
      case "busy_same_slot_substitute":
      case "direct_substitution":
        return <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 text-xs font-semibold">同科代课策略</span>;
      case "busy_class_swap":
      case "direct_swap":
        return <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 text-xs font-semibold">班内换课策略</span>;
      case "cp_sat_local":
      case "cpsat_local":
        return <span className="px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 text-xs font-semibold">CP-SAT 局部重排</span>;
      case "long_term_version":
        return <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 text-xs font-semibold">长期缺勤新版本</span>;
      default:
        return <span className="px-2.5 py-1 rounded bg-slate-700 text-slate-300 text-xs">{strat}</span>;
    }
  };

  return (
    <div
      className={`p-6 rounded-2xl border transition-all ${
        isRecommended
          ? "bg-slate-900/90 border-emerald-500/50 shadow-2xl shadow-emerald-950/40 ring-1 ring-emerald-500/30"
          : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-slate-800 text-xs font-mono font-bold text-slate-300">
            #{index + 1}
          </span>
          {getStrategyBadge(strategy)}
          {isRecommended && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
              <Award size={13} /> 推荐方案
            </span>
          )}
        </div>

        {score && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono">
            {score.changed_cells !== undefined && (
              <span>变动格 {score.changed_cells}</span>
            )}
            {score.affected_classes !== undefined && (
              <span>影响班级 {score.affected_classes}</span>
            )}
            {score.affected_teachers !== undefined && (
              <span>影响教师 {score.affected_teachers}</span>
            )}
            {score.slot_distance !== undefined && (
              <span>调整距离 {score.slot_distance}</span>
            )}
            {score.moved_split_blocks !== undefined && (
              <span>混班移动 {score.moved_split_blocks}</span>
            )}
          </div>
        )}
      </div>

      {/* Explanation */}
      <p className="text-sm text-slate-200 font-medium mb-4">{explanation}</p>

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="mb-4 p-3 bg-amber-950/40 border border-amber-500/30 rounded-lg text-xs text-amber-300 space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <ShieldAlert size={13} className="shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      {/* Operation Items */}
      {operations.length > 0 && (
        <div className="mb-6 space-y-2">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            调课操作清单 ({operations.length} 项)
          </div>
          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 text-xs">
            {operations.map((op, opIdx) => (
              <div
                key={opIdx}
                className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-slate-400">{op.date}</span>
                  {op.before_label && (
                    <span className="text-slate-300 font-medium">{op.before_label}</span>
                  )}
                  {op.before_label && op.after_label && (
                    <ArrowRight size={13} className="text-slate-500 shrink-0" />
                  )}
                  {op.after_label && (
                    <span className="text-slate-300 font-medium">{op.after_label}</span>
                  )}
                </div>
                <div className="text-slate-400 flex items-center gap-1 shrink-0">
                  <span className="text-slate-500 font-mono">
                    第 {op.period !== undefined ? op.period + 1 : ""} 节
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={() => onSelect(proposal)}
        className={`w-full py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all ${
          isRecommended
            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50"
            : "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
        }`}
      >
        <CheckCircle2 size={16} /> 选择并应用此方案
      </button>
    </div>
  );
}
