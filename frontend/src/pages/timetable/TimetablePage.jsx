import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { buildScheduleIndexes } from "../../domain/schedule";
import ScheduleGrid from "../../components/ScheduleGrid";
import { Calendar, Users, GraduationCap, Edit3, ArrowLeft, Download, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";

export default function TimetablePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [version, setVersion] = useState(null);
  const [activeTab, setActiveTab] = useState("class"); // 'class', 'teacher', 'date'
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [resolvedDay, setResolvedDay] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    if (activeTab === "date" && selectedDate) {
      loadDateSchedule(selectedDate);
    }
  }, [activeTab, selectedDate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const appState = await api.getState();
      setState(appState);

      const targetVersion = (appState.timetable_versions || []).find((v) => v.id === id);
      if (!targetVersion) {
        toast.error("未找到指定的课表版本");
        navigate("/");
        return;
      }

      setVersion(targetVersion);
      if (appState.classes?.length > 0) {
        setSelectedClassId(appState.classes[0].id);
      }
      if (appState.teachers?.length > 0) {
        setSelectedTeacherId(appState.teachers[0].id);
      }
    } catch (err) {
      toast.error(err.message || "加载课表失败");
    } finally {
      setLoading(false);
    }
  };

  const loadDateSchedule = async (dateStr) => {
    try {
      const dayData = await api.getDay(dateStr);
      setResolvedDay(dayData);
    } catch (err) {
      // no active timetable for date or error
      setResolvedDay(null);
    }
  };

  if (loading || !version || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 font-mono animate-pulse">正在加载课表版本...</div>
      </div>
    );
  }

  const indexes = buildScheduleIndexes(state);
  const currentClassGrid = version.class_schedules?.[selectedClassId] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              {version.name}
            </h1>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 font-mono flex items-center gap-1">
              <ShieldCheck size={12} /> 不可变版本
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-2 font-mono">
            版本 ID: {version.id} · 生效日期: {version.effective_from}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(`/timetables/${version.id}/edit`)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium shadow-lg shadow-indigo-900/30 transition-all"
          >
            <Edit3 size={15} /> 基于此版本创建修改
          </button>
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 border-b border-slate-800 pb-4">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("class")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "class"
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <GraduationCap size={16} /> 按班级查看
          </button>

          <button
            onClick={() => setActiveTab("teacher")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "teacher"
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Users size={16} /> 按教师查看
          </button>

          <button
            onClick={() => setActiveTab("date")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === "date"
                ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Calendar size={16} /> 按真实日期查看 (含代课)
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          {activeTab === "class" && (
            <select
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm"
            >
              {state.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          {activeTab === "teacher" && (
            <select
              value={selectedTeacherId}
              onChange={(e) => setSelectedTeacherId(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm"
            >
              {state.teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          )}

          {activeTab === "date" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-slate-800 border border-slate-700 text-white rounded-lg px-3 py-1.5 text-sm"
            >
            </input>
          )}
        </div>
      </div>

      {/* Grid Display */}
      {activeTab === "class" && (
        <ScheduleGrid grid={currentClassGrid} indexes={indexes} />
      )}

      {activeTab === "teacher" && (
        <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl">
          <p className="text-slate-300 font-medium">教师周课表视图</p>
          <p className="text-xs text-slate-500 mt-1">
            当前教师：{indexes.teachersById.get(selectedTeacherId)?.name || "未知"}
          </p>
        </div>
      )}

      {activeTab === "date" && (
        <div>
          {resolvedDay ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">
                    {resolvedDay.date} (周{["一", "二", "三", "四", "五", "六", "日"][resolvedDay.weekday]})
                  </span>
                  <span className="text-xs text-slate-400 ml-3">
                    解析版本 ID: {resolvedDay.version_id}
                  </span>
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300">
                  {resolvedDay.lessons?.length || 0} 节课
                </span>
              </div>
              <ScheduleGrid grid={currentClassGrid} indexes={indexes} />
            </div>
          ) : (
            <div className="p-8 text-center bg-slate-900/40 border border-slate-800 rounded-xl text-slate-500 text-sm">
              该日期暂无生效课表或为非工作日
            </div>
          )}
        </div>
      )}
    </div>
  );
}
