import React from "react";
import { createId } from "./catalogState";
import { Plus, Trash2 } from "lucide-react";

export default function SplitCourseBlockEditor({
  block,
  classes = [],
  subjects = [],
  teachers = [],
  rooms = [],
  onChange,
  onRemove,
}) {
  const currentBlock = block || {
    id: "split-1",
    name: "",
    source_class_ids: [],
    periods_per_week: 1,
    groups: [],
  };

  const handleNameChange = (e) => {
    if (!onChange) return;
    onChange({
      ...currentBlock,
      name: e.target.value,
    });
  };

  const handlePeriodsChange = (e) => {
    if (!onChange) return;
    const val = parseInt(e.target.value, 10);
    onChange({
      ...currentBlock,
      periods_per_week: Number.isNaN(val) ? 0 : val,
    });
  };

  const handleClassToggle = (classId) => {
    if (!onChange) return;
    const currentList = currentBlock.source_class_ids || [];
    let nextList;
    if (currentList.includes(classId)) {
      nextList = currentList.filter((id) => id !== classId);
    } else {
      nextList = [...currentList, classId];
    }
    onChange({
      ...currentBlock,
      source_class_ids: nextList,
    });
  };

  const handleAddGroup = () => {
    if (!onChange) return;
    const newGroup = {
      id: createId("group"),
      subject_id: "",
      teacher_id: "",
      room_id: "",
    };
    onChange({
      ...currentBlock,
      groups: [...(currentBlock.groups || []), newGroup],
    });
  };

  const handleRemoveGroup = (index) => {
    if (!onChange) return;
    const nextGroups = (currentBlock.groups || []).filter((_, i) => i !== index);
    onChange({
      ...currentBlock,
      groups: nextGroups,
    });
  };

  const handleGroupFieldChange = (index, field, value) => {
    if (!onChange) return;
    const nextGroups = (currentBlock.groups || []).map((grp, i) => {
      if (i === index) {
        return {
          ...grp,
          [field]: value,
        };
      }
      return grp;
    });
    onChange({
      ...currentBlock,
      groups: nextGroups,
    });
  };

  // Extract selected values across groups to disable in other groups
  const groups = currentBlock.groups || [];
  const selectedSubjectIds = groups.map((g) => g.subject_id).filter(Boolean);
  const selectedTeacherIds = groups.map((g) => g.teacher_id).filter(Boolean);
  const selectedRoomIds = groups.map((g) => g.room_id).filter(Boolean);

  // Class mapping for summary
  const classMap = new Map(classes.map((c) => [c.id, c.name]));
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const teacherMap = new Map(teachers.map((t) => [t.id, t.name]));
  const roomMap = new Map(rooms.map((r) => [r.id, r.name]));

  // Build summary text
  const sourceClassNames = (currentBlock.source_class_ids || [])
    .map((id) => classMap.get(id) || id)
    .filter(Boolean);

  const groupSummaryParts = groups.map((grp) => {
    const sName = subjectMap.get(grp.subject_id) || "未选科目";
    const tName = teacherMap.get(grp.teacher_id) || "未选教师";
    const rName = roomMap.get(grp.room_id) || "未选教室";
    return `${sName}（${tName} / ${rName}）`;
  });

  const summaryText =
    sourceClassNames.length > 0 || groupSummaryParts.length > 0
      ? `${sourceClassNames.join(" + ")}：${groupSummaryParts.join(" ｜ ")}`
      : "暂无走班摘要";

  return (
    <div className="p-4 bg-slate-900 border border-slate-700/80 rounded-xl space-y-5 text-slate-200">
      {/* Header with Title and optional Delete Block button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
        <h3 className="text-base font-semibold text-white flex items-center gap-2">
          走班课程块配置
        </h3>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded border border-rose-900/50 transition-colors w-fit"
          >
            <Trash2 size={13} />
            删除走班块
          </button>
        )}
      </div>

      {/* Block Name & Periods */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor={`block-name-${currentBlock.id}`}
            className="block text-xs font-medium text-slate-400 mb-1"
          >
            走班课程名称
          </label>
          <input
            id={`block-name-${currentBlock.id}`}
            type="text"
            value={currentBlock.name || ""}
            onChange={handleNameChange}
            placeholder="例如：地理/政治走班"
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
        <div>
          <label
            htmlFor={`block-periods-${currentBlock.id}`}
            className="block text-xs font-medium text-slate-400 mb-1"
          >
            每周课时
          </label>
          <input
            id={`block-periods-${currentBlock.id}`}
            type="number"
            min="1"
            max="40"
            value={currentBlock.periods_per_week ?? 1}
            onChange={handlePeriodsChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Source Classes (Checkboxes) */}
      <div role="group" aria-label="来源班级">
        <span className="block text-xs font-medium text-slate-400 mb-2">
          来源班级
        </span>
        <div className="flex flex-wrap gap-3">
          {classes.map((cls) => {
            const isChecked = (currentBlock.source_class_ids || []).includes(cls.id);
            const checkboxId = `class-${currentBlock.id}-${cls.id}`;
            return (
              <label
                key={cls.id}
                htmlFor={checkboxId}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs cursor-pointer select-none transition-colors ${
                  isChecked
                    ? "bg-indigo-950/40 border-indigo-500/80 text-indigo-200"
                    : "bg-slate-800/60 border-slate-700 hover:border-slate-600 text-slate-300"
                }`}
              >
                <input
                  id={checkboxId}
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => handleClassToggle(cls.id)}
                  className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 focus:ring-offset-0"
                />
                <span>{cls.name}</span>
              </label>
            );
          })}
          {classes.length === 0 && (
            <p className="text-xs text-slate-500">暂无可选班级</p>
          )}
        </div>
      </div>

      {/* Groups Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-slate-400">走班分组列表</span>
          <button
            type="button"
            onClick={handleAddGroup}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors shadow-sm"
          >
            <Plus size={13} />
            添加分组
          </button>
        </div>

        {groups.map((group, idx) => {
          const groupId = group.id || `grp-${idx}`;
          return (
            <div
              key={groupId}
              role="group"
              aria-label={`分组 ${idx + 1}`}
              className="p-3 bg-slate-800/60 border border-slate-700/70 rounded-lg space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-indigo-400">
                  分组 #{idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveGroup(idx)}
                  className="text-xs text-rose-400 hover:text-rose-300 p-1 flex items-center gap-0.5"
                  aria-label={`删除分组 ${idx + 1}`}
                >
                  <Trash2 size={12} />
                  删除组
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Subject Combobox */}
                <div>
                  <label
                    htmlFor={`grp-subject-${groupId}`}
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    科目
                  </label>
                  <select
                    id={`grp-subject-${groupId}`}
                    aria-label="科目"
                    value={group.subject_id || ""}
                    onChange={(e) =>
                      handleGroupFieldChange(idx, "subject_id", e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">请选择科目</option>
                    {subjects.map((sub) => {
                      const isChosenElsewhere =
                        selectedSubjectIds.includes(sub.id) &&
                        group.subject_id !== sub.id;
                      return (
                        <option
                          key={sub.id}
                          value={sub.id}
                          disabled={isChosenElsewhere}
                        >
                          {sub.name}
                          {isChosenElsewhere ? " (已被其他组选择)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Teacher Combobox */}
                <div>
                  <label
                    htmlFor={`grp-teacher-${groupId}`}
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    任课教师
                  </label>
                  <select
                    id={`grp-teacher-${groupId}`}
                    aria-label="任课教师"
                    value={group.teacher_id || ""}
                    onChange={(e) =>
                      handleGroupFieldChange(idx, "teacher_id", e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">请选择教师</option>
                    {teachers.map((t) => {
                      const isChosenElsewhere =
                        selectedTeacherIds.includes(t.id) &&
                        group.teacher_id !== t.id;
                      const isUnqualified =
                        group.subject_id &&
                        t.qualified_subject_ids &&
                        !t.qualified_subject_ids.includes(group.subject_id);
                      return (
                        <option
                          key={t.id}
                          value={t.id}
                          disabled={isChosenElsewhere}
                        >
                          {t.name}
                          {isUnqualified ? " [科目不匹配]" : ""}
                          {isChosenElsewhere ? " (已被选择)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* Room Combobox */}
                <div>
                  <label
                    htmlFor={`grp-room-${groupId}`}
                    className="block text-[11px] text-slate-400 mb-1"
                  >
                    上课教室
                  </label>
                  <select
                    id={`grp-room-${groupId}`}
                    aria-label="上课教室"
                    value={group.room_id || ""}
                    onChange={(e) =>
                      handleGroupFieldChange(idx, "room_id", e.target.value)
                    }
                    className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">请选择教室</option>
                    {rooms.map((r) => {
                      const isChosenElsewhere =
                        selectedRoomIds.includes(r.id) &&
                        group.room_id !== r.id;
                      return (
                        <option
                          key={r.id}
                          value={r.id}
                          disabled={isChosenElsewhere}
                        >
                          {r.name}
                          {isChosenElsewhere ? " (已被选择)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Region */}
      <div
        role="region"
        aria-label="走班摘要"
        className="p-3 bg-slate-950/60 border border-indigo-900/40 rounded-lg text-xs leading-relaxed text-indigo-300"
      >
        <span className="font-medium text-slate-400 mr-2">走班摘要：</span>
        {summaryText}
      </div>
    </div>
  );
}
