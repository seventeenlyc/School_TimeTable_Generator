import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api } from "../../api/client";
import { buildScheduleIndexes } from "../../domain/schedule";
import ScheduleGrid from "../../components/ScheduleGrid";
import AsyncButton from "../../components/AsyncButton";
import { Calendar, Users, GraduationCap, Edit3, ArrowLeft, ShieldCheck, Sparkles, User, MapPin, Download } from "lucide-react";
import toast from "react-hot-toast";

function parseChineseWeekday(dateStr) {
  if (!dateStr || typeof dateStr !== "string") return "";
  const parts = dateStr.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return "";
  const [year, month, day] = parts;
  const dateObj = new Date(year, month - 1, day);
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return weekdays[dateObj.getDay()] || "";
}

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
  const [exporting, setExporting] = useState(false);

  const loadData = useCallback(async () => {
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
  }, [id, navigate]);

  const loadDateSchedule = useCallback(async (dateStr) => {
    try {
      const dayData = await api.getCalendarDay(dateStr);
      setResolvedDay(dayData);
    } catch {
      // no active timetable for date or error
      setResolvedDay(null);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (activeTab === "date" && selectedDate) {
      loadDateSchedule(selectedDate);
    }
  }, [activeTab, selectedDate, loadDateSchedule]);

  const handleExport = async () => {
    if (exporting || !state || !version) return;

    try {
      setExporting(true);
      const { downloadClassTimetables } = await import("../../domain/exportTimetable");
      await downloadClassTimetables(state, version);
      toast.success("全部班级课表已导出");
    } catch (err) {
      toast.error(err?.message || "导出课表失败");
    } finally {
      setExporting(false);
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

        <div className="flex flex-wrap items-center gap-3">
          <AsyncButton
            type="button"
            onClick={handleExport}
            loading={exporting}
            loadingLabel="导出中…"
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 disabled:cursor-wait disabled:opacity-80 text-white text-sm font-medium shadow-lg shadow-emerald-950/30 transition-all"
          >
            <Download size={15} /> 导出全部班级课表
          </AsyncButton>
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
            <Calendar size={16} /> 按真实日期查看
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
              aria-label="选择教师"
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

      {activeTab === "teacher" && (() => {
        const rawTeacherGrid = version.teacher_schedules?.[selectedTeacherId];
        const defaultPeriods = state.settings?.periods_per_day || 8;
        const periodsCount = rawTeacherGrid?.[0]?.length || defaultPeriods;
        const weekdays = ["周一", "周二", "周三", "周四", "周五"];

        return (
          <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/60 shadow-xl backdrop-blur-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-700 bg-slate-800/80 text-xs font-semibold uppercase tracking-wider text-slate-300">
                  <th scope="col" className="py-3 px-4 w-16 text-center">节次</th>
                  {weekdays.map((dayName, dIdx) => (
                    <th scope="col" key={dIdx} className="py-3 px-4 min-w-[140px] text-center">
                      {dayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-sm">
                {Array.from({ length: periodsCount }).map((_, periodIdx) => (
                  <tr key={periodIdx} className="hover:bg-slate-800/20 transition-colors">
                    <td className="py-3 px-4 text-center font-mono font-medium text-slate-400 bg-slate-800/40">
                      第 {periodIdx + 1} 节
                    </td>
                    {weekdays.map((_, dayIdx) => {
                      const assignment = rawTeacherGrid?.[dayIdx]?.[periodIdx];
                      if (!assignment) {
                        return (
                          <td key={dayIdx} className="p-2.5 text-center align-top hover:bg-slate-800/40 transition-all">
                            <div className="h-16 flex items-center justify-center text-xs text-slate-600 font-mono">
                              空课
                            </div>
                          </td>
                        );
                      }

                      const subject = indexes.subjectsById.get(assignment.subject_id);
                      const subjectName = subject ? subject.name : (assignment.subject_id || "未知科目");

                      const classNames = (assignment.class_ids || [])
                        .map((cid) => indexes.classesById.get(cid)?.name || cid)
                        .join(" + ");

                      const room = assignment.room_id ? indexes.roomsById.get(assignment.room_id) : null;
                      const roomName = room ? room.name : (assignment.room_id || "");

                      const isSplit = assignment.target_kind === "split_group";

                      return (
                        <td key={dayIdx} className="p-2.5 text-center align-top hover:bg-slate-800/40 transition-all">
                          {isSplit ? (
                            <div className="min-h-16 p-2 rounded-lg bg-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1">
                                  <Sparkles size={11} className="text-indigo-400" />
                                  {subjectName}
                                </span>
                                <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1 rounded">
                                  走班
                                </span>
                              </div>
                              {classNames && (
                                <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                                  <GraduationCap size={10} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{classNames}</span>
                                </div>
                              )}
                              {roomName && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={9} className="text-slate-500 shrink-0" />
                                  <span className="truncate">{roomName}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="min-h-16 p-2 rounded-lg border bg-slate-800/70 border-slate-700/60 flex flex-col justify-between text-left">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-emerald-300">
                                  {subjectName}
                                </span>
                              </div>
                              {classNames && (
                                <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                                  <GraduationCap size={10} className="text-slate-400 shrink-0" />
                                  <span className="truncate">{classNames}</span>
                                </div>
                              )}
                              {roomName && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <MapPin size={9} className="text-slate-500 shrink-0" />
                                  <span className="truncate">{roomName}</span>
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })()}

      {activeTab === "date" && (
        <div>
          {resolvedDay ? (
            <div className="space-y-6">
              <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">
                    {resolvedDay.date} {parseChineseWeekday(resolvedDay.date) ? `(${parseChineseWeekday(resolvedDay.date)})` : ""}
                  </span>
                  {resolvedDay.version_id && (
                    <span className="text-xs text-slate-400 ml-3 font-mono">
                      解析版本 ID: {resolvedDay.version_id}
                    </span>
                  )}
                </div>
                <span className="text-xs px-2.5 py-1 rounded bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 font-medium">
                  {Object.values(resolvedDay.class_schedules || {}).reduce(
                    (acc, lessons) => acc + (lessons || []).filter(Boolean).length,
                    0
                  )}{" "}
                  节课
                </span>
              </div>

              <div className="space-y-6">
                {Object.entries(resolvedDay.class_schedules || {}).map(([classId, lessons]) => {
                  const className = indexes.classesById.get(classId)?.name || classId;
                  const activeLessons = (lessons || [])
                    .map((lesson, periodIdx) => ({ lesson, periodIdx }))
                    .filter((item) => item.lesson != null);

                  return (
                    <div
                      key={classId}
                      className="bg-slate-900/60 border border-slate-800 rounded-xl p-5 shadow-lg backdrop-blur-md"
                    >
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                        <h3 className="text-base font-bold text-white flex items-center gap-2">
                          <GraduationCap size={18} className="text-emerald-400" />
                          {className}
                        </h3>
                        <span className="text-xs font-mono text-slate-400">
                          {activeLessons.length} 节课
                        </span>
                      </div>

                      {activeLessons.length === 0 ? (
                        <div className="py-6 text-center text-slate-500 text-sm">
                          当日无课
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                          {activeLessons.map(({ lesson, periodIdx }) => {
                            const isSplit = lesson.cell?.kind === "split";
                            const targetIds = lesson.target_ids || [];
                            const subjectIds = lesson.subject_ids || [];
                            const teacherIds = lesson.teacher_ids || [];
                            const roomIds = lesson.room_ids || [];

                            const subjectNames = subjectIds.map(
                              (id) => indexes.subjectsById.get(id)?.name || id || "未知"
                            );

                            const items = targetIds.map((targetId, idx) => {
                              const req = indexes.requirementsById.get(targetId);
                              const actualTeacherId = teacherIds[idx];
                              const actualTeacherName =
                                indexes.teachersById.get(actualTeacherId)?.name ||
                                actualTeacherId ||
                                "未知";
                              const isSubstituted =
                                !isSplit &&
                                Boolean(req && req.teacher_id && req.teacher_id !== actualTeacherId);

                              const roomId = roomIds[idx];
                              const roomName = roomId
                                ? indexes.roomsById.get(roomId)?.name || roomId
                                : "";

                              return {
                                subjectName:
                                  subjectNames[idx] ||
                                  (req && indexes.subjectsById.get(req.subject_id)?.name) ||
                                  "未知",
                                teacherName: actualTeacherName,
                                isSubstituted,
                                roomName,
                              };
                            });

                            const hasSubstitution = items.some((it) => it.isSubstituted);

                            return (
                              <div
                                key={periodIdx}
                                className={`p-3 rounded-lg border flex flex-col justify-between text-left transition-all ${
                                  isSplit
                                    ? "bg-indigo-950/40 border-indigo-500/30"
                                    : hasSubstitution
                                    ? "bg-amber-950/40 border-amber-500/40"
                                    : "bg-slate-800/70 border-slate-700/60"
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-mono font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                                      第 {periodIdx + 1} 节
                                    </span>
                                    {isSplit && (
                                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded flex items-center gap-1 font-medium">
                                        <Sparkles size={10} className="text-indigo-400" />
                                        走班
                                      </span>
                                    )}
                                  </div>

                                  <div className="space-y-1.5">
                                    {isSplit ? (
                                      <div>
                                        <div className="text-xs font-bold text-indigo-300">
                                          {subjectNames.join(" / ") || "走班课程"}
                                        </div>
                                        <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                                          <User size={10} className="text-slate-400 shrink-0" />
                                          <span className="truncate">
                                            {items.map((it) => it.teacherName).join(" / ")}
                                          </span>
                                        </div>
                                        {items.some((it) => it.roomName) && (
                                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                            <MapPin size={9} className="text-slate-500 shrink-0" />
                                            <span className="truncate">
                                              {items
                                                .map((it) => it.roomName)
                                                .filter(Boolean)
                                                .join(" / ")}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    ) : (
                                      <div>
                                        <div className="text-xs font-bold text-emerald-300">
                                          {subjectNames[0] || "未知科目"}
                                        </div>
                                        <div className="text-[11px] text-slate-300 mt-1 flex items-center gap-1">
                                          <User size={10} className="text-slate-400 shrink-0" />
                                          <span className="truncate">
                                            {items[0]?.teacherName || "未知教师"}
                                          </span>
                                          {items[0]?.isSubstituted && (
                                            <span
                                              data-testid="substitute-badge"
                                              className="text-[10px] text-amber-300 font-semibold ml-1 bg-amber-950/60 border border-amber-500/30 px-1 py-0.5 rounded"
                                            >
                                              代课
                                            </span>
                                          )}
                                        </div>
                                        {items[0]?.roomName && (
                                          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                            <MapPin size={9} className="text-slate-500 shrink-0" />
                                            <span className="truncate">{items[0].roomName}</span>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
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
