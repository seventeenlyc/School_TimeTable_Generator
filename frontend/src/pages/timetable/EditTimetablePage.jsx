import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { buildScheduleIndexes, applyCellMove } from "../../domain/schedule";
import ScheduleGrid from "../../components/ScheduleGrid";
import AsyncButton from "../../components/AsyncButton";
import { ArrowLeft, Save, AlertCircle, Sparkles } from "lucide-react";
import toast from "react-hot-toast";

export default function EditTimetablePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [baseVersion, setBaseVersion] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [editedSchedules, setEditedSchedules] = useState({});
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [newName, setNewName] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const appState = await api.getState();
      setState(appState);

      const target = (appState.timetable_versions || []).find((v) => v.id === id);
      if (!target) {
        toast.error("未找到指定的课表版本");
        navigate("/");
        return;
      }

      setBaseVersion(target);
      setNewName(`${target.name} (修订版)`);
      setEditedSchedules(JSON.parse(JSON.stringify(target.class_schedules || {})));
      if (appState.classes?.length > 0) {
        setSelectedClassId(appState.classes[0].id);
      }
    } catch (err) {
      toast.error(err.message || "加载课表失败");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCellClick = ({ day, period }) => {
    if (!selectedSlot) {
      setSelectedSlot({ day, period });
      toast("已选中起始位置，点击另一个格子以交换/移动课程", { icon: "👆" });
    } else {
      if (selectedSlot.day === day && selectedSlot.period === period) {
        setSelectedSlot(null);
        return;
      }

      const indexes = buildScheduleIndexes(state);
      const updated = applyCellMove(
        editedSchedules,
        selectedClassId,
        selectedSlot,
        { day, period },
        indexes
      );

      setEditedSchedules(updated);
      setSelectedSlot(null);
      toast.success("课节调整成功（所有受影响班级已联动同步）");
    }
  };

  const handleSave = async () => {
    if (!newName.trim()) {
      toast.error("请输入新版本名称");
      return;
    }
    if (!effectiveFrom) {
      toast.error("请选择生效日期");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        base_revision: state.revision,
        name: newName.trim(),
        effective_from: effectiveFrom,
        class_schedules: editedSchedules,
      };

      const result = await api.createChildVersion(baseVersion.id, payload);
      const versions = result?.timetable_versions || [];
      const matches = versions.filter(
        (v) =>
          v.parent_version_id === baseVersion.id &&
          v.name === payload.name &&
          v.effective_from === payload.effective_from &&
          v.id !== baseVersion.id
      );

      if (!matches.length) {
        throw new Error("未找到新创建的课表版本");
      }

      matches.sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (timeB !== timeA) {
          return timeB - timeA;
        }
        return String(b.id || "").localeCompare(String(a.id || ""));
      });

      const child = matches[0];
      toast.success("已成功创建新课表版本！");
      navigate(`/timetables/${child.id}`);
    } catch (err) {
      toast.error(err.message || "保存新版本失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !baseVersion || !state) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 font-mono animate-pulse">正在加载课表编辑器...</div>
      </div>
    );
  }

  const indexes = buildScheduleIndexes(state);
  const currentGrid = editedSchedules[selectedClassId] || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-slate-800 gap-4">
        <div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/timetables/${baseVersion.id}`)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Sparkles className="text-indigo-400" />
              调整课表并创建新版本
            </h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            基于基准版本「{baseVersion.name}」创建独立的新版本，原版本保持不可变
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AsyncButton
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            loadingLabel="正在创建…"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
          >
            <Save size={16} /> 保存为新版本
          </AsyncButton>
        </div>
      </div>

      {/* Version Metadata Form */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 p-4 bg-slate-900/60 border border-slate-800 rounded-xl">
        <div>
          <label className="block text-xs text-slate-400 mb-1">新版本名称</label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">生效起始日期</label>
          <input
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div>
          <label className="block text-xs text-slate-400 mb-1">当前编辑班级</label>
          <select
            value={selectedClassId}
            onChange={(e) => {
              setSelectedClassId(e.target.value);
              setSelectedSlot(null);
            }}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-emerald-400"
          >
            {state.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Editor Tip */}
      <div className="mb-4 p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-lg text-xs text-indigo-300 flex items-center gap-2">
        <AlertCircle size={14} className="shrink-0" />
        提示：点击任意课节作为起点，再点击目标课节即可完成交换或移动。走班课将自动在所有关联班级中同步移动。
      </div>

      {/* Interactive Grid */}
      <ScheduleGrid
        grid={currentGrid}
        indexes={indexes}
        editable={true}
        selectedSlot={selectedSlot}
        onCellClick={handleCellClick}
      />
    </div>
  );
}
