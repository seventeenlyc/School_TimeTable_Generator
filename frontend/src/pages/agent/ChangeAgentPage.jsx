import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import { buildEvent } from "./changeForm";
import ProposalCard from "./ProposalCard";
import { Bot, Sparkles, User, Calendar, Plus, Trash2, ShieldAlert, CheckCircle2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function ChangeAgentPage() {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [kind, setKind] = useState("absence"); // 'absence' | 'busy'
  const [teacherId, setTeacherId] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [reason, setReason] = useState("");
  const [busySlots, setBusySlots] = useState([]);

  // Proposal State
  const [proposing, setProposing] = useState(false);
  const [proposals, setProposals] = useState(null);
  const [diagnostics, setDiagnostics] = useState([]);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      setLoading(true);
      const data = await api.getState();
      setState(data);
      if (data.teachers?.length > 0) {
        setTeacherId(data.teachers[0].id);
      }
    } catch (err) {
      toast.error(err.message || "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handlePropose = async () => {
    try {
      setProposing(true);
      setDiagnostics([]);
      setProposals(null);

      const eventPayload = buildEvent({
        kind,
        teacherId,
        startDate,
        endDate,
        reason,
        busySlots,
      });

      const res = await api.proposeChange(eventPayload);
      if (res.proposals && res.proposals.length > 0) {
        setProposals(res.proposals);
        toast.success(`成功生成 ${res.proposals.length} 个调课候选方案！`);
      } else {
        toast.error("未找到完全可行的调课方案");
      }
    } catch (err) {
      if (err.data?.diagnostics) {
        setDiagnostics(err.data.diagnostics);
      }
      toast.error(err.message || "生成方案失败");
    } finally {
      setProposing(false);
    }
  };

  const handleApply = async () => {
    if (!selectedProposal) return;
    try {
      setApplying(true);
      await api.applyChange(selectedProposal);
      toast.success("调课方案已成功应用！");
      setSelectedProposal(null);
      setProposals(null);
      // Reload state or redirect
      const updated = await api.getState();
      setState(updated);
      navigate("/");
    } catch (err) {
      toast.error(err.message || "应用调课方案失败");
    } finally {
      setApplying(false);
    }
  };

  if (loading || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 font-mono animate-pulse">正在加载调课 Agent...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 pb-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2.5">
          <Bot className="text-indigo-400" />
          智能调课 Agent
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          基于约束求解与启发式策略，自动解决教师请假、缺勤及临时有事冲突
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Side: Event Input Form */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-5">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar size={18} className="text-emerald-400" />
              提交调课事件
            </h2>

            {/* Event Kind Switcher */}
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-800/80 rounded-xl border border-slate-700/60">
              <button
                type="button"
                onClick={() => setKind("absence")}
                className={`py-2 text-xs font-medium rounded-lg transition-all ${
                  kind === "absence"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                教师缺勤/请假
              </button>
              <button
                type="button"
                onClick={() => setKind("busy")}
                className={`py-2 text-xs font-medium rounded-lg transition-all ${
                  kind === "busy"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                特定时段繁忙
              </button>
            </div>

            {/* Teacher Select */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">受影响教师</label>
              <select
                value={teacherId}
                onChange={(e) => setTeacherId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              >
                {state.teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Selection */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">开始日期</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">结束日期</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            {/* Busy Slots Editor */}
            {kind === "busy" && (
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400">繁忙时段清单</span>
                  <button
                    type="button"
                    onClick={() =>
                      setBusySlots([
                        ...busySlots,
                        { date: startDate, period: 0 },
                      ])
                    }
                    className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300"
                  >
                    <Plus size={13} /> 添加时段
                  </button>
                </div>
                {busySlots.map((slot, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="date"
                      value={slot.date}
                      onChange={(e) => {
                        const next = [...busySlots];
                        next[idx].date = e.target.value;
                        setBusySlots(next);
                      }}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white flex-1"
                    />
                    <select
                      value={slot.period}
                      onChange={(e) => {
                        const next = [...busySlots];
                        next[idx].period = parseInt(e.target.value);
                        setBusySlots(next);
                      }}
                      className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                    >
                      {Array.from({ length: state.settings?.periods_per_day || 7 }).map((_, p) => (
                        <option key={p} value={p}>
                          第 {p + 1} 节
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setBusySlots(busySlots.filter((_, i) => i !== idx))}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Reason */}
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">调课原因说明 (可选)</label>
              <input
                type="text"
                value={reason}
                placeholder="例如：外出参加教研活动"
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-400"
              />
            </div>

            {/* Submit Button */}
            <button
              type="button"
              onClick={handlePropose}
              disabled={proposing}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-950/50 transition-all disabled:opacity-50"
            >
              <Sparkles size={16} />
              {proposing ? "正在规划调课方案..." : "智能生成调课方案"}
            </button>
          </div>
        </div>

        {/* Right Side: Proposals List */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles size={18} className="text-indigo-400" />
            调课候选方案
          </h2>

          {proposals === null && !proposing && (
            <div className="p-12 text-center bg-slate-900/40 border border-slate-800/80 rounded-2xl text-slate-500 text-sm">
              在左侧表单中配置调课事件并点击「智能生成调课方案」
            </div>
          )}

          {proposals && proposals.length === 0 && (
            <div className="p-8 bg-slate-900/60 border border-slate-800 rounded-2xl text-center text-slate-400 text-sm">
              未找到完全可行的调课方案，可能需要人工协调课程。
            </div>
          )}

          {proposals && proposals.length > 0 && (
            <div className="space-y-4">
              {proposals.map((prop, idx) => (
                <ProposalCard
                  key={prop.id || idx}
                  proposal={prop}
                  index={idx}
                  isRecommended={idx === 0}
                  onSelect={(p) => setSelectedProposal(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Apply Confirmation Modal */}
      {selectedProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <CheckCircle2 className="text-emerald-400" />
              确认应用调课方案
            </h3>
            <p className="text-sm text-slate-300">
              您即将把该调课方案应用到系统中。系统将自动记录调课事件并生效代课/换课规则：
            </p>
            <div className="p-4 bg-slate-800/60 rounded-xl text-xs text-slate-300 font-mono space-y-1">
              <div>策略: {selectedProposal.strategy}</div>
              <div>包含操作: {selectedProposal.operations?.length || 0} 项</div>
              <div>基准版本: {selectedProposal.base_version_id}</div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={applying}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-950/40 disabled:opacity-50"
              >
                {applying ? "正在应用..." : "确认应用并更新课表"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
