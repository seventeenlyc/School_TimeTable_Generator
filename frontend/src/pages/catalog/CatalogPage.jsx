import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import { catalogFromState, buildCatalogPayload, validateCatalogForm, createId } from "./catalogState";
import SplitCourseBlockEditor from "./SplitCourseBlockEditor";
import { buildCatalogErrorDetails } from "./catalogErrors";
import CatalogErrorPanel from "./CatalogErrorPanel";
import CatalogImportDialog from "./CatalogImportDialog";
import { useCatalogLocator } from "./useCatalogLocator";
import AsyncButton from "../../components/AsyncButton";
import {
  Users,
  GraduationCap,
  Building2,
  BookOpen,
  Layers,
  Sparkles,
  Save,
  Plus,
  Trash2,
  Settings,
} from "lucide-react";
import toast from "react-hot-toast";

const WEEKDAYS = [
  { id: 0, label: "周一" },
  { id: 1, label: "周二" },
  { id: 2, label: "周三" },
  { id: 3, label: "周四" },
  { id: 4, label: "周五" },
  { id: 5, label: "周六" },
];

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState("classes");
  const [state, setState] = useState(null);
  const [form, setForm] = useState({
    settings: {
      working_days: 6,
      periods_per_day: 8,
      long_absence_days: 28,
      max_daily_subject_periods: 2,
      backup_limit: 20,
    },
    classes: [],
    teachers: [],
    rooms: [],
    subjects: [],
    course_requirements: [],
    split_course_blocks: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [errors, setErrors] = useState([]);
  const { registerEntity, locateTarget, highlightedEntityId, markNewEntity } = useCatalogLocator(setActiveTab);

  // Local state for teacher weekly unavailable slots builder (per teacher ID)
  const [slotInputs, setSlotInputs] = useState({});

  useEffect(() => {
    loadState();
  }, []);

  const loadState = async () => {
    try {
      setLoading(true);
      const data = await api.getState();
      setState(data);
      setForm(catalogFromState(data));
      setErrors([]);
    } catch (err) {
      toast.error(err.message || "加载数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    const localErrors = validateCatalogForm(form);
    if (localErrors.length > 0) {
      setErrors(localErrors);
      toast.error("请先修正表单中的错误");
      return;
    }

    try {
      setSaving(true);
      setErrors([]);
      const payload = buildCatalogPayload(form, state?.revision || 0);
      const updatedState = await api.updateCatalog(payload);
      setState(updatedState);
      setForm(catalogFromState(updatedState));
      toast.success("基础数据保存成功！");
    } catch (err) {
      setErrors(Array.isArray(err.details) && err.details.length ? err.details : [err.message || "保存失败"]);
      toast.error(err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSavingSettings(true);
      setErrors([]);
      const settingsPayload = {
        base_revision: state?.revision || 0,
        settings: {
          ...form.settings,
          working_days: 6,
          periods_per_day: Number(form.settings.periods_per_day) || 8,
          long_absence_days: Number(form.settings.long_absence_days) || 28,
          max_daily_subject_periods: Number(form.settings.max_daily_subject_periods) || 2,
          backup_limit: Number(form.settings.backup_limit) || 20,
        },
      };
      const updatedState = await api.updateSettings(settingsPayload);
      setState(updatedState);
      setForm(catalogFromState(updatedState));
      toast.success("系统设置保存成功！");
    } catch (err) {
      setErrors(Array.isArray(err.details) && err.details.length ? err.details : [err.message || "保存系统设置失败"]);
      toast.error(err.message || "保存系统设置失败");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApplyImport = ({ nextForm, created }) => {
    setForm(nextForm);
    setErrors([]);
    setImportOpen(false);
    const target = [
      ["teachers", created.teachers?.[0]],
      ["requirements", created.courseRequirements?.[0]],
      ["classes", created.classes?.[0]],
      ["subjects", created.subjects?.[0]],
      ["rooms", created.rooms?.[0]],
    ].find(([, id]) => id);
    if (target) markNewEntity({ tab: target[0], entityId: target[1], field: "name" });
    toast.success("Excel 数据已应用到草稿，请检查后保存");
  };

  // Helper for adding unavailable slot to a teacher
  const handleAddSlot = (teacherId) => {
    const input = slotInputs[teacherId] || { weekday: 0, period: 0 };
    const weekday = Number(input.weekday);
    const period = Number(input.period);

    setForm((prev) => {
      const teachers = prev.teachers.map((t) => {
        if (t.id !== teacherId) return t;
        const currentSlots = t.weekly_unavailable_slots || [];
        const exists = currentSlots.some((s) => s.weekday === weekday && s.period === period);
        if (exists) return t;
        return {
          ...t,
          weekly_unavailable_slots: [...currentSlots, { weekday, period }],
        };
      });
      return { ...prev, teachers };
    });
  };

  const handleRemoveSlot = (teacherId, weekday, period) => {
    setForm((prev) => {
      const teachers = prev.teachers.map((t) => {
        if (t.id !== teacherId) return t;
        return {
          ...t,
          weekly_unavailable_slots: (t.weekly_unavailable_slots || []).filter(
            (s) => !(s.weekday === weekday && s.period === period)
          ),
        };
      });
      return { ...prev, teachers };
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 font-mono animate-pulse">正在加载基础数据...</div>
      </div>
    );
  }

  const periodsCount = Number(form.settings?.periods_per_day) || 8;
  const catalogErrorDetails = buildCatalogErrorDetails(form, errors);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8 pb-6 border-b border-slate-800 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Layers className="text-emerald-400" />
            基础排课数据管理
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            配置班级、教师、场地、课程要求及走班课程块
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 font-medium text-slate-200 transition-all"
          >
            导入 Excel
          </button>
          <AsyncButton
            onClick={handleSave}
            disabled={saving}
            loading={saving}
            loadingLabel="保存中…"
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium text-white shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
          >
            <Save size={16} /> 保存基础数据
          </AsyncButton>
        </div>
      </div>

      {/* Errors Banner */}
      <CatalogErrorPanel errors={catalogErrorDetails} onLocate={locateTarget} />

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3">
        {[
          { id: "classes", label: `班级 (${form.classes.length})`, icon: GraduationCap },
          { id: "teachers", label: `教师 (${form.teachers.length})`, icon: Users },
          { id: "rooms", label: `教室 (${form.rooms.length})`, icon: Building2 },
          { id: "subjects", label: `科目 (${form.subjects.length})`, icon: BookOpen },
          { id: "requirements", label: `课程要求 (${form.course_requirements.length})`, icon: Layers },
          { id: "split_blocks", label: `走班课程 (${form.split_course_blocks.length})`, icon: Sparkles },
          { id: "settings", label: "系统设置", icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-slate-800 text-emerald-400 border border-emerald-500/30"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-6">
        {/* Classes Tab */}
        {activeTab === "classes" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">班级列表</h2>
              <button
                onClick={() =>
                  setForm({
                    ...form,
                    classes: [...form.classes, { id: createId("class"), name: `新班级 ${form.classes.length + 1}` }],
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加班级
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {form.classes.map((cls, idx) => (
                <div
                  key={cls.id}
                  ref={(node) => registerEntity("classes", cls.id, node)}
                  data-entity-id={cls.id}
                  data-error-highlight={highlightedEntityId === cls.id ? "true" : "false"}
                  className={`p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg flex items-center justify-between ${highlightedEntityId === cls.id ? "catalog-error-highlight" : ""}`}
                >
                  <input
                    type="text"
                    aria-label={`班级名称 ${idx + 1}`}
                    data-field="name"
                    value={cls.name}
                    onChange={(e) => {
                      const updated = [...form.classes];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setForm({ ...form, classes: updated });
                    }}
                    className="bg-transparent border-b border-transparent focus:border-emerald-400 focus:outline-none text-white text-sm w-full mr-2"
                  />
                  <button
                    onClick={() => {
                      setForm({
                        ...form,
                        classes: form.classes.filter((_, i) => i !== idx),
                      });
                    }}
                    aria-label={`删除班级 ${cls.name}`}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Teachers Tab */}
        {activeTab === "teachers" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">教师列表</h2>
              <button
                onClick={() => {
                  const newTeacher = {
                    id: createId("teacher"),
                    name: `教师 ${form.teachers.length + 1}`,
                    qualified_subject_ids: [],
                    teaching_assignment_ids: [],
                    weekly_unavailable_slots: [],
                    homeroom_class_id: null,
                    main_subject_id: null,
                  };
                  setForm({ ...form, teachers: [newTeacher, ...form.teachers] });
                  markNewEntity({ tab: "teachers", entityId: newTeacher.id, field: "name" });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加教师
              </button>
            </div>
            <div className="space-y-4">
              {form.teachers.map((teacher, idx) => {
                const currentSlotInput = slotInputs[teacher.id] || { weekday: 0, period: 0 };
                return (
                  <div
                    key={teacher.id}
                    ref={(node) => registerEntity("teachers", teacher.id, node)}
                    data-entity-id={teacher.id}
                    data-error-highlight={highlightedEntityId === teacher.id ? "true" : "false"}
                    role="group"
                    aria-label={`教师 ${teacher.name}`}
                    className={`p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-4 ${highlightedEntityId === teacher.id ? "catalog-error-highlight" : ""}`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700/60">
                      <div className="flex items-center gap-3">
                        <label htmlFor={`teacher-name-${teacher.id}`} className="text-xs text-slate-400">
                          教师姓名
                        </label>
                        <input
                          id={`teacher-name-${teacher.id}`}
                          aria-label="教师姓名"
                          data-field="name"
                          type="text"
                          value={teacher.name}
                          onChange={(e) => {
                            const updated = [...form.teachers];
                            updated[idx] = { ...updated[idx], name: e.target.value };
                            setForm({ ...form, teachers: updated });
                          }}
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-sm text-white focus:border-emerald-400 focus:outline-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          setForm({
                            ...form,
                            teachers: form.teachers.filter((_, i) => i !== idx),
                          });
                        }}
                        aria-label={`删除教师 ${teacher.name}`}
                        className="text-slate-500 hover:text-rose-400 p-1 self-end sm:self-auto"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Homeroom Class */}
                      <div>
                        <label htmlFor={`homeroom-${teacher.id}`} className="block text-xs text-slate-400 mb-1">
                          班主任班级
                        </label>
                        <select
                          id={`homeroom-${teacher.id}`}
                          aria-label="班主任班级"
                          value={teacher.homeroom_class_id || ""}
                          onChange={(e) => {
                            const updated = [...form.teachers];
                            updated[idx] = { ...updated[idx], homeroom_class_id: e.target.value || null };
                            setForm({ ...form, teachers: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">无（非班主任）</option>
                          {form.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Main Subject */}
                      <div>
                        <label htmlFor={`main-subject-${teacher.id}`} className="block text-xs text-slate-400 mb-1">
                          主教学科
                        </label>
                        <select
                          id={`main-subject-${teacher.id}`}
                          aria-label="主教学科"
                          value={teacher.main_subject_id || ""}
                          onChange={(e) => {
                            const updated = [...form.teachers];
                            updated[idx] = { ...updated[idx], main_subject_id: e.target.value || null };
                            setForm({ ...form, teachers: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="">未指定主教学科</option>
                          {form.subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Qualified Subjects Checkboxes */}
                    <div>
                      <span className="block text-xs text-slate-400 mb-2">资质科目</span>
                      <div className="flex flex-wrap gap-2">
                        {form.subjects.map((sub) => {
                          const isQualified = (teacher.qualified_subject_ids || []).includes(sub.id);
                          return (
                            <label
                              key={sub.id}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs cursor-pointer select-none transition-colors ${
                                isQualified
                                  ? "bg-emerald-950/40 border-emerald-500/80 text-emerald-200"
                                  : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600"
                              }`}
                            >
                              <input
                                type="checkbox"
                                aria-label={sub.name}
                                checked={isQualified}
                                onChange={() => {
                                  const current = teacher.qualified_subject_ids || [];
                                  const nextQuals = isQualified
                                    ? current.filter((id) => id !== sub.id)
                                    : [...current, sub.id];
                                  const updated = [...form.teachers];
                                  updated[idx] = { ...updated[idx], qualified_subject_ids: nextQuals };
                                  setForm({ ...form, teachers: updated });
                                }}
                                className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0"
                              />
                              <span>{sub.name}</span>
                            </label>
                          );
                        })}
                        {form.subjects.length === 0 && (
                          <span className="text-xs text-slate-500">请先在“科目”标签页添加科目</span>
                        )}
                      </div>
                    </div>

                    {/* Weekly Unavailable Slots */}
                    <div className="pt-2 border-t border-slate-700/40">
                      <span className="block text-xs text-slate-400 mb-2">固定每周不可用时间（禁排设置）</span>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <select
                          aria-label="禁排星期"
                          value={currentSlotInput.weekday}
                          onChange={(e) =>
                            setSlotInputs({
                              ...slotInputs,
                              [teacher.id]: {
                                ...currentSlotInput,
                                weekday: Number(e.target.value),
                              },
                            })
                          }
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        >
                          {WEEKDAYS.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.label}
                            </option>
                          ))}
                        </select>
                        <select
                          aria-label="禁排节次"
                          value={currentSlotInput.period}
                          onChange={(e) =>
                            setSlotInputs({
                              ...slotInputs,
                              [teacher.id]: {
                                ...currentSlotInput,
                                period: Number(e.target.value),
                              },
                            })
                          }
                          className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        >
                          {Array.from({ length: periodsCount }, (_, pIdx) => (
                            <option key={pIdx} value={pIdx}>
                              第 {pIdx + 1} 节
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => handleAddSlot(teacher.id)}
                          aria-label="添加禁排时间"
                          className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded border border-slate-700 flex items-center gap-1"
                        >
                          <Plus size={12} /> 添加禁排
                        </button>
                      </div>

                      {/* Render current slots */}
                      <div className="flex flex-wrap gap-2">
                        {(teacher.weekly_unavailable_slots || []).map((s, sIdx) => {
                          const dayLabel = WEEKDAYS.find((d) => d.id === s.weekday)?.label || `周${s.weekday + 1}`;
                          return (
                            <span
                              key={`${s.weekday}-${s.period}-${sIdx}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/40 border border-rose-800 text-rose-300 text-xs"
                            >
                              {dayLabel} 第 {s.period + 1} 节
                              <button
                                type="button"
                                onClick={() => handleRemoveSlot(teacher.id, s.weekday, s.period)}
                                aria-label={`删除禁排 ${dayLabel} 第 ${s.period + 1} 节`}
                                className="text-rose-400 hover:text-rose-200 ml-1"
                              >
                                &times;
                              </button>
                            </span>
                          );
                        })}
                        {(!teacher.weekly_unavailable_slots || teacher.weekly_unavailable_slots.length === 0) && (
                          <span className="text-xs text-slate-500">全周可用，无禁排时间段</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rooms Tab */}
        {activeTab === "rooms" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">教室与场地</h2>
              <button
                onClick={() =>
                  setForm({
                    ...form,
                    rooms: [...form.rooms, { id: createId("room"), name: `教室 ${form.rooms.length + 1}` }],
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加教室
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {form.rooms.map((room, idx) => (
                <div
                  key={room.id}
                  ref={(node) => registerEntity("rooms", room.id, node)}
                  data-entity-id={room.id}
                  data-error-highlight={highlightedEntityId === room.id ? "true" : "false"}
                  className={`p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg flex items-center justify-between ${highlightedEntityId === room.id ? "catalog-error-highlight" : ""}`}
                >
                  <input
                    type="text"
                    aria-label={`教室名称 ${idx + 1}`}
                    data-field="name"
                    value={room.name}
                    onChange={(e) => {
                      const updated = [...form.rooms];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setForm({ ...form, rooms: updated });
                    }}
                    className="bg-transparent border-b border-transparent focus:border-emerald-400 focus:outline-none text-white text-sm w-full mr-2"
                  />
                  <button
                    onClick={() => {
                      setForm({
                        ...form,
                        rooms: form.rooms.filter((_, i) => i !== idx),
                      });
                    }}
                    aria-label={`删除教室 ${room.name}`}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subjects Tab */}
        {activeTab === "subjects" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">科目列表</h2>
              <button
                onClick={() =>
                  setForm({
                    ...form,
                    subjects: [...form.subjects, { id: createId("subject"), name: `科目 ${form.subjects.length + 1}` }],
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加科目
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {form.subjects.map((sub, idx) => (
                <div
                  key={sub.id}
                  ref={(node) => registerEntity("subjects", sub.id, node)}
                  data-entity-id={sub.id}
                  data-error-highlight={highlightedEntityId === sub.id ? "true" : "false"}
                  className={`p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg flex items-center justify-between ${highlightedEntityId === sub.id ? "catalog-error-highlight" : ""}`}
                >
                  <input
                    type="text"
                    aria-label={`科目名称 ${idx + 1}`}
                    data-field="name"
                    value={sub.name}
                    onChange={(e) => {
                      const updated = [...form.subjects];
                      updated[idx] = { ...updated[idx], name: e.target.value };
                      setForm({ ...form, subjects: updated });
                    }}
                    className="bg-transparent border-b border-transparent focus:border-emerald-400 focus:outline-none text-white text-sm w-full mr-2"
                  />
                  <button
                    onClick={() => {
                      setForm({
                        ...form,
                        subjects: form.subjects.filter((_, i) => i !== idx),
                      });
                    }}
                    aria-label={`删除科目 ${sub.name}`}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Requirements Tab */}
        {activeTab === "requirements" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">普通课程要求</h2>
              <button
                onClick={() => {
                  const newRequirement = {
                    id: createId("req"),
                    class_id: form.classes[0]?.id || "",
                    subject_id: form.subjects[0]?.id || "",
                    teacher_id: form.teachers[0]?.id || "",
                    room_id: null,
                    periods_per_week: 4,
                    consecutive_periods: 1,
                    fixed_slots: [],
                  };
                  setForm({ ...form, course_requirements: [newRequirement, ...form.course_requirements] });
                  markNewEntity({ tab: "requirements", entityId: newRequirement.id, field: "class_id" });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加课程要求
              </button>
            </div>
            <div className="space-y-4">
              {form.course_requirements.map((req, idx) => {
                const reqId = req.id || `req-${idx}`;
                return (
                  <div
                    key={reqId}
                    ref={(node) => registerEntity("requirements", reqId, node)}
                    data-entity-id={reqId}
                    data-error-highlight={highlightedEntityId === reqId ? "true" : "false"}
                    role="group"
                    aria-label={`课程要求 ${idx + 1}`}
                    className={`p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl space-y-3 ${highlightedEntityId === reqId ? "catalog-error-highlight" : ""}`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-700/40">
                      <span className="text-xs font-semibold text-emerald-400">
                        课程要求 #{idx + 1}
                      </span>
                      <button
                        onClick={() => {
                          setForm({
                            ...form,
                            course_requirements: form.course_requirements.filter((_, i) => i !== idx),
                          });
                        }}
                        aria-label={`删除课程要求 ${idx + 1}`}
                        className="text-slate-500 hover:text-rose-400 p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-3 items-center">
                      {/* Class */}
                      <div>
                        <label htmlFor={`req-class-${reqId}`} className="block text-[11px] text-slate-400 mb-1">
                          班级
                        </label>
                        <select
                          id={`req-class-${reqId}`}
                          aria-label="班级"
                          data-field="class_id"
                          value={req.class_id}
                          onChange={(e) => {
                            const updated = [...form.course_requirements];
                            updated[idx] = { ...updated[idx], class_id: e.target.value };
                            setForm({ ...form, course_requirements: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">请选择班级</option>
                          {form.classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Subject */}
                      <div>
                        <label htmlFor={`req-subject-${reqId}`} className="block text-[11px] text-slate-400 mb-1">
                          科目
                        </label>
                        <select
                          id={`req-subject-${reqId}`}
                          aria-label="科目"
                          data-field="subject_id"
                          value={req.subject_id}
                          onChange={(e) => {
                            const updated = [...form.course_requirements];
                            updated[idx] = { ...updated[idx], subject_id: e.target.value };
                            setForm({ ...form, course_requirements: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">请选择科目</option>
                          {form.subjects.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Teacher */}
                      <div>
                        <label htmlFor={`req-teacher-${reqId}`} className="block text-[11px] text-slate-400 mb-1">
                          教师
                        </label>
                        <select
                          id={`req-teacher-${reqId}`}
                          aria-label="教师"
                          data-field="teacher_id"
                          value={req.teacher_id}
                          onChange={(e) => {
                            const updated = [...form.course_requirements];
                            updated[idx] = { ...updated[idx], teacher_id: e.target.value };
                            setForm({ ...form, course_requirements: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">请选择教师</option>
                          {form.teachers.map((t) => {
                            const isMismatch = req.subject_id && !t.qualified_subject_ids?.includes(req.subject_id);
                            return (
                              <option key={t.id} value={t.id}>
                                {t.name}{isMismatch ? " (无资质)" : ""}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Room (Optional) */}
                      <div>
                        <label htmlFor={`req-room-${reqId}`} className="block text-[11px] text-slate-400 mb-1">
                          教室
                        </label>
                        <select
                          id={`req-room-${reqId}`}
                          aria-label="教室"
                          value={req.room_id || ""}
                          onChange={(e) => {
                            const updated = [...form.course_requirements];
                            updated[idx] = { ...updated[idx], room_id: e.target.value || null };
                            setForm({ ...form, course_requirements: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"
                        >
                          <option value="">默认（班级固定教室）</option>
                          {form.rooms.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Periods per week */}
                      <div>
                        <label htmlFor={`req-periods-${reqId}`} className="block text-[11px] text-slate-400 mb-1">
                          周课时
                        </label>
                        <input
                          id={`req-periods-${reqId}`}
                          aria-label="周课时"
                          type="number"
                          min="1"
                          max="40"
                          value={req.periods_per_week}
                          onChange={(e) => {
                            const updated = [...form.course_requirements];
                            updated[idx] = {
                              ...updated[idx],
                              periods_per_week: parseInt(e.target.value, 10) || 1,
                            };
                            setForm({ ...form, course_requirements: updated });
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                        />
                      </div>

                    </div>

                    {/* Fixed Slots */}
                    <div className="pt-2 border-t border-slate-700/40">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-medium text-slate-400">固定时间</span>
                        <button
                          type="button"
                          onClick={() => {
                            const workingDays = Number(form.settings?.working_days) || 6;
                            const periodsPerDay = Number(form.settings?.periods_per_day) || 8;
                            const currentSlots = Array.isArray(req.fixed_slots) ? req.fixed_slots : [];

                            // Find first unused slot scanning weekday then period
                            let nextSlot = null;
                            for (let w = 0; w < workingDays; w++) {
                              for (let p = 0; p < periodsPerDay; p++) {
                                if (!currentSlots.some((s) => s.weekday === w && s.period === p)) {
                                  nextSlot = { weekday: w, period: p };
                                  break;
                                }
                              }
                              if (nextSlot) break;
                            }

                            if (!nextSlot) {
                              return;
                            }

                            const updated = [...form.course_requirements];
                            updated[idx] = {
                              ...updated[idx],
                              fixed_slots: [...currentSlots, nextSlot],
                            };
                            setForm({ ...form, course_requirements: updated });
                          }}
                          className="flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300"
                          aria-label="添加固定时间"
                        >
                          <Plus size={12} /> 添加固定时间
                        </button>
                      </div>

                      {Array.isArray(req.fixed_slots) && req.fixed_slots.length > 0 && (
                        <div className="space-y-2">
                          {req.fixed_slots.map((slot, sIdx) => (
                            <div key={sIdx} className="flex items-center gap-3 bg-slate-900/60 p-2 rounded border border-slate-700/50">
                              <div className="flex items-center gap-1.5">
                                <label className="text-[11px] text-slate-400">星期:</label>
                                <select
                                  aria-label="固定星期"
                                  value={slot.weekday ?? 0}
                                  onChange={(e) => {
                                    const updated = [...form.course_requirements];
                                    const newSlots = [...(updated[idx].fixed_slots || [])];
                                    newSlots[sIdx] = { ...newSlots[sIdx], weekday: parseInt(e.target.value, 10) || 0 };
                                    updated[idx] = { ...updated[idx], fixed_slots: newSlots };
                                    setForm({ ...form, course_requirements: updated });
                                  }}
                                  className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                >
                                  {Array.from({ length: Number(form.settings?.working_days) || 6 }, (_, dayIdx) => (
                                    <option key={dayIdx} value={dayIdx}>
                                      {["星期一", "星期二", "星期三", "星期四", "星期五", "星期六", "星期日"][dayIdx]}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <label className="text-[11px] text-slate-400">节次:</label>
                                <input
                                  type="number"
                                  aria-label="固定节次"
                                  min="1"
                                  max={Number(form.settings?.periods_per_day) || 8}
                                  value={(slot.period ?? 0) + 1}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    const period0 = isNaN(val) ? 0 : Math.max(0, val - 1);
                                    const updated = [...form.course_requirements];
                                    const newSlots = [...(updated[idx].fixed_slots || [])];
                                    newSlots[sIdx] = { ...newSlots[sIdx], period: period0 };
                                    updated[idx] = { ...updated[idx], fixed_slots: newSlots };
                                    setForm({ ...form, course_requirements: updated });
                                  }}
                                  className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                                />
                              </div>

                              <button
                                type="button"
                                onClick={() => {
                                  const updated = [...form.course_requirements];
                                  const newSlots = (updated[idx].fixed_slots || []).filter((_, i) => i !== sIdx);
                                  updated[idx] = { ...updated[idx], fixed_slots: newSlots };
                                  setForm({ ...form, course_requirements: updated });
                                }}
                                aria-label="删除固定时间"
                                className="text-slate-500 hover:text-rose-400 p-1 ml-auto"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Split Course Blocks Tab */}
        {activeTab === "split_blocks" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">走班/分流课程块</h2>
              <button
                onClick={() => {
                  const defaultClasses = form.classes.slice(0, 2).map((c) => c.id);
                  const newBlock = {
                    id: createId("split"),
                    name: `新走班课程 ${form.split_course_blocks.length + 1}`,
                    source_class_ids: defaultClasses,
                    periods_per_week: 1,
                    groups: [],
                  };
                  setForm({
                    ...form,
                    split_course_blocks: [...form.split_course_blocks, newBlock],
                  });
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加走班块
              </button>
            </div>
            <div className="space-y-6">
              {form.split_course_blocks.map((block, idx) => (
                <div
                  key={block.id}
                  ref={(node) => registerEntity("split_blocks", block.id, node)}
                  data-entity-id={block.id}
                  data-error-highlight={highlightedEntityId === block.id ? "true" : "false"}
                  className={highlightedEntityId === block.id ? "catalog-error-highlight" : ""}
                >
                  <SplitCourseBlockEditor
                    block={block}
                    classes={form.classes}
                    subjects={form.subjects}
                    teachers={form.teachers}
                    rooms={form.rooms}
                    onChange={(updatedBlock) => {
                      const updated = [...form.split_course_blocks];
                      updated[idx] = updatedBlock;
                      setForm({ ...form, split_course_blocks: updated });
                    }}
                    onRemove={() => {
                      setForm({
                        ...form,
                        split_course_blocks: form.split_course_blocks.filter((_, i) => i !== idx),
                      });
                    }}
                  />
                </div>
              ))}
              {form.split_course_blocks.length === 0 && (
                <div className="text-center py-12 text-slate-500 text-sm">
                  暂无走班课程块，点击右上角“添加走班块”进行配置
                </div>
              )}
            </div>
          </div>
        )}

        {/* System Settings Tab */}
        {activeTab === "settings" && (
          <div className="space-y-6 max-w-2xl">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white">排课系统设置</h2>
              <AsyncButton
                onClick={handleSaveSettings}
                disabled={savingSettings}
                loading={savingSettings}
                loadingLabel="保存设置中…"
                className="flex items-center gap-1.5 px-4 py-2 text-xs bg-emerald-600 hover:bg-emerald-500 font-medium text-white rounded-lg shadow transition-colors disabled:opacity-50"
              >
                <Save size={14} /> 保存系统设置
              </AsyncButton>
            </div>

            <div className="space-y-4">
              {/* Working days */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">
                  每周工作天数
                </label>
                <div className="px-3 py-2 bg-slate-800/40 border border-slate-700/60 rounded-lg text-sm text-emerald-400 font-medium">
                  周一至周六（6 天）
                </div>
                <p className="text-[11px] text-slate-500 mt-1">固定工作制，不支持修改</p>
              </div>

              {/* Periods per day */}
              <div>
                <label htmlFor="settings-periods-per-day" className="block text-xs font-medium text-slate-400 mb-1">
                  每日节数
                </label>
                <input
                  id="settings-periods-per-day"
                  aria-label="每日节数"
                  type="number"
                  min="1"
                  max="16"
                  value={form.settings?.periods_per_day ?? 8}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        periods_per_day: Number.isNaN(val) ? "" : val,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Max daily subject periods */}
              <div>
                <label htmlFor="settings-max-daily-subject" className="block text-xs font-medium text-slate-400 mb-1">
                  单日单科最大课时
                </label>
                <input
                  id="settings-max-daily-subject"
                  aria-label="单日单科最大课时"
                  type="number"
                  min="1"
                  max="8"
                  value={form.settings?.max_daily_subject_periods ?? 2}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        max_daily_subject_periods: Number.isNaN(val) ? "" : val,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Long absence days */}
              <div>
                <label htmlFor="settings-long-absence" className="block text-xs font-medium text-slate-400 mb-1">
                  长假天数阈值
                </label>
                <input
                  id="settings-long-absence"
                  aria-label="长假天数阈值"
                  type="number"
                  min="1"
                  max="100"
                  value={form.settings?.long_absence_days ?? 28}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        long_absence_days: Number.isNaN(val) ? "" : val,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Backup limit */}
              <div>
                <label htmlFor="settings-backup-limit" className="block text-xs font-medium text-slate-400 mb-1">
                  备份保留上限
                </label>
                <input
                  id="settings-backup-limit"
                  aria-label="备份保留上限"
                  type="number"
                  min="1"
                  max="100"
                  value={form.settings?.backup_limit ?? 20}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setForm({
                      ...form,
                      settings: {
                        ...form.settings,
                        backup_limit: Number.isNaN(val) ? "" : val,
                      },
                    });
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <CatalogImportDialog
        form={form}
        open={importOpen}
        onApply={handleApplyImport}
        onClose={() => setImportOpen(false)}
      />
    </div>
  );
}
