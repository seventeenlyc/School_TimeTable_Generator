import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import RecoveryPanel from "./RecoveryPanel";
import {
  Calendar,
  Clock,
  Layers,
  PlusCircle,
  RefreshCw,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Database,
} from "lucide-react";

export default function DashboardPage() {
  const [state, setState] = useState(null);
  const [timetables, setTimetables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setErrorStatus(null);
    setErrorMsg(null);
    try {
      const [stateData, timetableData] = await Promise.all([
        api.getState(),
        api.listTimetables(),
      ]);
      setState(stateData);
      setTimetables(timetableData || []);
    } catch (err) {
      if (err.status === 503) {
        setErrorStatus(503);
      } else {
        setErrorMsg(err.message || "加载数据失败");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (errorStatus === 503) {
    return (
      <div className="min-h-screen bg-[#050c18] text-white pt-24 px-6">
        <RecoveryPanel onRestored={loadData} />
      </div>
    );
  }

  const activeVersion = state?.timetable_versions?.find((v) => v.is_active) ||
    state?.timetable_versions?.[state.timetable_versions.length - 1];

  return (
    <div className="min-h-screen bg-[#050c18] text-gray-100 pt-24 pb-16 px-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            课表管理工作台
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            本地排课与智能调课引擎 — 本地运行，离线可用
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-700 rounded-xl text-gray-300 transition-all border border-slate-700/50"
            title="刷新数据"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <Link
            to="/generate"
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all text-sm"
          >
            <Sparkles size={16} />
            生成新课表
          </Link>
        </div>
      </div>

      {errorMsg && (
        <div className="bg-red-500/20 border border-red-500/40 rounded-xl p-4 text-red-300 text-sm mb-6 flex items-center gap-2">
          <AlertCircle size={18} />
          {errorMsg}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-[#0b1329]/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">班级数</span>
            <Layers size={18} className="text-cyan-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {state?.classes?.length ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">已录入班级总数</div>
        </div>

        <div className="bg-[#0b1329]/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">教师数</span>
            <Sliders size={18} className="text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {state?.teachers?.length ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">参与排课教师</div>
        </div>

        <div className="bg-[#0b1329]/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">教室数</span>
            <Database size={18} className="text-purple-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {state?.rooms?.length ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">可用物理教室</div>
        </div>

        <div className="bg-[#0b1329]/80 border border-slate-800 rounded-2xl p-5 backdrop-blur-sm">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">课表版本</span>
            <Calendar size={18} className="text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-white">
            {state?.timetable_versions?.length ?? 0}
          </div>
          <div className="text-xs text-gray-500 mt-1">历史与生效版本</div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Link
          to="/catalog"
          className="bg-[#0b1329]/90 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Sliders size={20} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">基础数据管理</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            配置教师信息、班级名单、教室资源、周课时需求及分流走班规则。
          </p>
        </Link>

        <Link
          to="/generate"
          className="bg-[#0b1329]/90 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Sparkles size={20} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">自动生成基础课表</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            利用 CP-SAT 运筹约束求解器，秒级生成满足全部硬约束的基准全校课表。
          </p>
        </Link>

        <Link
          to="/changes"
          className="bg-[#0b1329]/90 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all group shadow-lg"
        >
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Calendar size={20} />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">智能代调课代理</h3>
          <p className="text-sm text-gray-400 leading-relaxed">
            针对教师请假、临时繁忙或长期缺勤，自动推荐同科代课与最优换课方案。
          </p>
        </Link>
      </div>

      {/* Timetable Versions Section */}
      <div className="bg-[#0b1329]/90 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock size={20} className="text-cyan-400" />
            课表版本与日历
          </h2>
          {activeVersion && (
            <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              当前生效：{activeVersion.name || activeVersion.id}
            </span>
          )}
        </div>

        {timetables.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="mb-4">暂无生成的课表版本</p>
            <Link
              to="/generate"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-bold rounded-xl text-sm"
            >
              <PlusCircle size={16} />
              立即生成第一份基础课表
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {timetables.map((t) => (
              <div
                key={t.id}
                className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between hover:border-slate-700 transition-all"
              >
                <div>
                  <div className="font-semibold text-white text-base">
                    {t.name || t.id}
                  </div>
                  <div className="text-xs text-gray-400 mt-1 flex items-center gap-3">
                    <span>生效日期：{t.effective_from || "基准"}</span>
                    <span>班级数：{Object.keys(t.class_schedules || {}).length}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    to={`/timetables/${t.id}`}
                    className="px-3.5 py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold rounded-lg transition-all"
                  >
                    查看课表
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
