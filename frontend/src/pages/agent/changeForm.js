export function buildEvent({
  kind = "absence",
  teacherId,
  startDate,
  endDate,
  reason = "",
  busySlots = [],
}) {
  if (!teacherId) {
    throw new Error("请选择教师");
  }
  if (!startDate) {
    throw new Error("请选择开始日期");
  }

  if (kind === "absence") {
    const finalEnd = endDate || startDate;
    if (new Date(finalEnd) < new Date(startDate)) {
      throw new Error("结束日期不能早于开始日期");
    }

    return {
      kind: "absence",
      teacher_id: teacherId,
      start_date: startDate,
      end_date: finalEnd,
      reason: reason || "教师请假/缺勤",
      busy_slots: [],
    };
  }

  if (kind === "busy") {
    if (!busySlots || busySlots.length === 0) {
      throw new Error("请至少添加一个繁忙时段");
    }

    return {
      kind: "busy",
      teacher_id: teacherId,
      start_date: startDate,
      end_date: endDate || startDate,
      reason: reason || "教师临时有事/繁忙",
      busy_slots: busySlots.map((s) => ({
        date: s.date,
        period: parseInt(s.period),
      })),
    };
  }

  throw new Error(`未知事件类型: ${kind}`);
}
