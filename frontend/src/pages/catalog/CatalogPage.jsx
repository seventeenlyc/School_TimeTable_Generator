import React, { useState, useEffect } from "react";
import { api } from "../../api/client";
import { catalogFromState, buildCatalogPayload, validateCatalogForm, createId } from "./catalogState";
import { Users, GraduationCap, Building2, BookOpen, Layers, Sparkles, Save, Plus, Trash2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

export default function CatalogPage() {
  const [activeTab, setActiveTab] = useState("classes");
  const [state, setState] = useState(null);
  const [form, setForm] = useState({
    classes: [],
    teachers: [],
    rooms: [],
    subjects: [],
    course_requirements: [],
    split_course_blocks: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState([]);

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
      setErrors([err.message || "保存失败"]);
      toast.error(err.message || "保存失败");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400 font-mono animate-pulse">正在加载基础数据...</div>
      </div>
    );
  }

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
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 font-medium text-white shadow-lg shadow-emerald-900/30 transition-all disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? "保存中..." : "保存基础数据"}
          </button>
        </div>
      </div>

      {/* Errors Banner */}
      {errors.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300">
          <div className="flex items-center gap-2 font-bold mb-2">
            <AlertCircle size={16} /> 数据校验提示
          </div>
          <ul className="list-disc pl-5 text-xs space-y-1">
            {errors.map((e, idx) => (
              <li key={idx}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-800 pb-3">
        {[
          { id: "classes", label: `班级 (${form.classes.length})`, icon: GraduationCap },
          { id: "teachers", label: `教师 (${form.teachers.length})`, icon: Users },
          { id: "rooms", label: `教室 (${form.rooms.length})`, icon: Building2 },
          { id: "subjects", label: `科目 (${form.subjects.length})`, icon: BookOpen },
          { id: "requirements", label: `课程要求 (${form.course_requirements.length})`, icon: Layers },
          { id: "split_blocks", label: `走班课程 (${form.split_course_blocks.length})`, icon: Sparkles },
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
                <div key={cls.id} className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg flex items-center justify-between">
                  <input
                    type="text"
                    value={cls.name}
                    onChange={(e) => {
                      const updated = [...form.classes];
                      updated[idx].name = e.target.value;
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
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "teachers" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">教师列表</h2>
              <button
                onClick={() =>
                  setForm({
                    ...form,
                    teachers: [
                      ...form.teachers,
                      {
                        id: createId("teacher"),
                        name: `教师 ${form.teachers.length + 1}`,
                        qualified_subject_ids: [],
                        unavailable_slots: [],
                      },
                    ],
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加教师
              </button>
            </div>
            <div className="space-y-3">
              {form.teachers.map((teacher, idx) => (
                <div key={teacher.id} className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg flex items-center justify-between gap-4">
                  <input
                    type="text"
                    value={teacher.name}
                    onChange={(e) => {
                      const updated = [...form.teachers];
                      updated[idx].name = e.target.value;
                      setForm({ ...form, teachers: updated });
                    }}
                    className="bg-transparent border-b border-transparent focus:border-emerald-400 focus:outline-none text-white text-sm max-w-[180px]"
                  />
                  <div className="text-xs text-slate-400 flex-1">
                    资质科目: {teacher.qualified_subject_ids?.length || 0} 门
                  </div>
                  <button
                    onClick={() => {
                      setForm({
                        ...form,
                        teachers: form.teachers.filter((_, i) => i !== idx),
                      });
                    }}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                <div key={room.id} className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg flex items-center justify-between">
                  <input
                    type="text"
                    value={room.name}
                    onChange={(e) => {
                      const updated = [...form.rooms];
                      updated[idx].name = e.target.value;
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
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

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
                <div key={sub.id} className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg flex items-center justify-between">
                  <input
                    type="text"
                    value={sub.name}
                    onChange={(e) => {
                      const updated = [...form.subjects];
                      updated[idx].name = e.target.value;
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
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "requirements" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">课程需求 (周课时配置)</h2>
              <button
                onClick={() =>
                  setForm({
                    ...form,
                    course_requirements: [
                      ...form.course_requirements,
                      {
                        id: createId("req"),
                        class_id: form.classes[0]?.id || "",
                        subject_id: form.subjects[0]?.id || "",
                        teacher_id: form.teachers[0]?.id || "",
                        periods_per_week: 4,
                      },
                    ],
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加课程要求
              </button>
            </div>
            <div className="space-y-3">
              {form.course_requirements.map((req, idx) => (
                <div key={req.id} className="p-3 bg-slate-800/50 border border-slate-700/60 rounded-lg grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                  <select
                    value={req.class_id}
                    onChange={(e) => {
                      const updated = [...form.course_requirements];
                      updated[idx].class_id = e.target.value;
                      setForm({ ...form, course_requirements: updated });
                    }}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    {form.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={req.subject_id}
                    onChange={(e) => {
                      const updated = [...form.course_requirements];
                      updated[idx].subject_id = e.target.value;
                      setForm({ ...form, course_requirements: updated });
                    }}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    {form.subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={req.teacher_id}
                    onChange={(e) => {
                      const updated = [...form.course_requirements];
                      updated[idx].teacher_id = e.target.value;
                      setForm({ ...form, course_requirements: updated });
                    }}
                    className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  >
                    {form.teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-1">
                    <span className="text-xs text-slate-400">周课时:</span>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={req.periods_per_week}
                      onChange={(e) => {
                        const updated = [...form.course_requirements];
                        updated[idx].periods_per_week = parseInt(e.target.value) || 1;
                        setForm({ ...form, course_requirements: updated });
                      }}
                      className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-white w-16"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => {
                        setForm({
                          ...form,
                          course_requirements: form.course_requirements.filter((_, i) => i !== idx),
                        });
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === "split_blocks" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-white">走班/分流课程块</h2>
              <button
                onClick={() =>
                  setForm({
                    ...form,
                    split_course_blocks: [
                      ...form.split_course_blocks,
                      {
                        id: createId("split"),
                        source_class_ids: form.classes.slice(0, 2).map((c) => c.id),
                        periods_per_week: 2,
                        groups: [
                          {
                            id: createId("grp"),
                            subject_id: form.subjects[0]?.id || "",
                            teacher_id: form.teachers[0]?.id || "",
                            room_id: form.rooms[0]?.id || "",
                          },
                          {
                            id: createId("grp"),
                            subject_id: form.subjects[1]?.id || form.subjects[0]?.id || "",
                            teacher_id: form.teachers[1]?.id || form.teachers[0]?.id || "",
                            room_id: form.rooms[1]?.id || form.rooms[0]?.id || "",
                          },
                        ],
                      },
                    ],
                  })
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg border border-slate-700"
              >
                <Plus size={14} /> 添加走班块
              </button>
            </div>
            <div className="space-y-4">
              {form.split_course_blocks.map((block, idx) => (
                <div key={block.id} className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-indigo-400">
                      走班块 #{idx + 1} ({block.periods_per_week} 节/周)
                    </span>
                    <button
                      onClick={() => {
                        setForm({
                          ...form,
                          split_course_blocks: form.split_course_blocks.filter((_, i) => i !== idx),
                        });
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="text-xs text-slate-300">
                    来源班级数: {block.source_class_ids?.length || 0}，分组数: {block.groups?.length || 0}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
