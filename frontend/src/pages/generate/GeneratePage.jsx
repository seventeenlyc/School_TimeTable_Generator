import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { catalogFromState, validateCatalogForm } from "../catalog/catalogState";
import { buildScheduleIndexes } from "../../domain/schedule";
import ScheduleGrid from "../../components/ScheduleGrid";
import AsyncButton from "../../components/AsyncButton";
import {
  Sparkles,
  Calendar,
  Save,
  AlertTriangle,
  Users,
  Layers,
  ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";

function getLocalDateString() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default function GeneratePage() {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [appState, setAppState] = useState(null);

  const [name, setName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(getLocalDateString());

  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState(null);
  const [candidate, setCandidate] = useState(null);

  const [selectedClassId, setSelectedClassId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  useEffect(() => {
    loadAppState();
  }, []);

  const loadAppState = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const state = await api.getState();
      setAppState(state);
    } catch (err) {
      setLoadError(err.message || "加载基础数据失败");
    } finally {
      setLoading(false);
    }
  };

  const validationErrors = useMemo(() => {
    if (!appState) return [];
    const form = catalogFromState(appState);
    const errors = validateCatalogForm(form);

    const hasRequirements =
      (appState.course_requirements && appState.course_requirements.length > 0) ||
      (appState.split_course_blocks && appState.split_course_blocks.length > 0);

    if (!hasRequirements) {
      errors.push("未配置课程要求");
    }

    return errors;
  }, [appState]);

  const isFormValid =
    name.trim().length > 0 &&
    effectiveFrom.trim().length > 0 &&
    validationErrors.length === 0;

  const handleGenerate = async (e) => {
    e?.preventDefault();
    if (!isFormValid || generating) return;

    try {
      setGenerating(true);
      setGenerateError(null);
      setSaveError(null);

      const result = await api.generateTimetable({
        name: name.trim(),
        effective_from: effectiveFrom,
      });

      setCandidate(result);
      if (result && result.class_schedules) {
        const classIds = Object.keys(result.class_schedules);
        if (classIds.length > 0) {
          setSelectedClassId(classIds[0]);
        }
      }
      toast.success("课表生成成功，请在下方预览确认");
    } catch (err) {
      setCandidate(null);
      setGenerateError(err.message || "生成失败");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!candidate || !appState || saving) return;

    try {
      setSaving(true);
      setSaveError(null);
      await api.saveTimetable({
        base_revision: appState.revision,
        version: candidate,
      });
      toast.success("课表保存成功");
      navigate(`/timetables/${candidate.id}`);
    } catch (err) {
      setSaveError(err.message || "保存课表失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-slate-400 font-mono animate-pulse flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          正在加载基础数据...
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12">
        <div role="alert" className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300">
          <div className="flex items-center gap-2 font-bold mb-1">
            <AlertTriangle size={18} />
            基础数据加载失败
          </div>
          <p className="text-sm text-red-200/80">{loadError}</p>
          <button
            onClick={loadAppState}
            className="mt-4 px-4 py-1.5 rounded-lg bg-red-800/40 hover:bg-red-800/60 text-sm font-medium transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  const indexes = appState ? buildScheduleIndexes(appState) : null;
  const candidateClassIds = candidate?.class_schedules
    ? Object.keys(candidate.class_schedules)
    : [];

  const activeClassGrid =
    candidate && selectedClassId
      ? candidate.class_schedules[selectedClassId] || []
      : [];

  const selectedClassName =
    appState?.classes?.find((c) => c.id === selectedClassId)?.name ||
    selectedClassId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
          <Sparkles className="text-emerald-400" size={24} />
          智能课表生成
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          配置课表名称与生效日期，调用自动排课引擎生成候选排课方案并进行预览与保存。
        </p>
      </div>

      {/* Validation Errors Notice */}
      {validationErrors.length > 0 && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-200"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex items-center gap-2 font-semibold">
              <AlertTriangle size={18} className="text-amber-400" />
              基础数据校验未通过 ({validationErrors.length} 项问题)
            </div>
            <Link
              to="/catalog"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition-colors"
            >
              前往基础数据
              <ArrowRight size={14} />
            </Link>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-amber-200/80">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Generation Error Alert */}
      {generateError && (
        <div
          role="alert"
          className="mb-8 p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 flex items-start gap-3"
        >
          <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="text-sm font-medium">
            {generateError}
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md mb-8">
        <form onSubmit={handleGenerate} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
          <div>
            <label
              htmlFor="timetable-name"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
            >
              课表名称
            </label>
            <input
              id="timetable-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：2026秋季课表"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <label
              htmlFor="timetable-date"
              className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2"
            >
              生效日期
            </label>
            <input
              id="timetable-date"
              type="date"
              value={effectiveFrom}
              onChange={(e) => setEffectiveFrom(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>

          <div>
            <AsyncButton
              type="submit"
              disabled={!isFormValid || generating}
              loading={generating}
              loadingLabel="生成中…"
              className="w-full h-[42px] inline-flex items-center justify-center gap-2 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm shadow-lg shadow-emerald-950/40 transition-all"
            >
              <Sparkles size={16} /> 生成预览
            </AsyncButton>
          </div>
        </form>
      </div>

      {/* Preview Section */}
      {candidate && (
        <div className="space-y-6">
          {/* Candidate Header & Save Bar */}
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  生成成功
                </span>
                <h2 className="text-xl font-bold text-slate-100">{candidate.name}</h2>
              </div>
              <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                <span className="flex items-center gap-1.5">
                  <Calendar size={13} className="text-slate-500" />
                  生效日期: {candidate.effective_from}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={13} className="text-slate-500" />
                  班级总数: {candidateClassIds.length}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <AsyncButton
                type="button"
                onClick={handleSave}
                disabled={saving}
                loading={saving}
                loadingLabel="保存中…"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 hover:from-emerald-400 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-lg shadow-indigo-950/40 transition-all"
              >
                <Save size={16} /> 确认保存
              </AsyncButton>
            </div>
          </div>

          {/* Save Error Alert */}
          {saveError && (
            <div
              role="alert"
              className="p-4 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 flex items-start gap-3"
            >
              <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm font-medium">
                {saveError}
              </div>
            </div>
          )}

          {/* Class Tabs */}
          {candidateClassIds.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {candidateClassIds.map((cid) => {
                const cls = appState?.classes?.find((c) => c.id === cid);
                const className = cls ? cls.name : cid;
                const isActive = cid === selectedClassId;
                return (
                  <button
                    key={cid}
                    onClick={() => setSelectedClassId(cid)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap flex items-center gap-2 ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                        : "bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60"
                    }`}
                  >
                    <Layers size={14} className={isActive ? "text-emerald-400" : "text-slate-500"} />
                    {className}
                  </button>
                );
              })}
            </div>
          )}

          {/* Class Schedule Grid */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <span>班级课表预览：</span>
                <span className="text-emerald-400">{selectedClassName}</span>
              </h3>
            </div>
            {indexes && (
              <ScheduleGrid
                grid={activeClassGrid}
                indexes={indexes}
                editable={false}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
