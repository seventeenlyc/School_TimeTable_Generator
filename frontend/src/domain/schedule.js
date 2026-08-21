/**
 * Domain schedule helpers and index builders for local timetable rendering
 */

export function buildScheduleIndexes(state) {
  const classesById = new Map();
  (state?.classes || []).forEach((c) => classesById.set(c.id, c));

  const teachersById = new Map();
  (state?.teachers || []).forEach((t) => teachersById.set(t.id, t));

  const roomsById = new Map();
  (state?.rooms || []).forEach((r) => roomsById.set(r.id, r));

  const subjectsById = new Map();
  (state?.subjects || []).forEach((s) => subjectsById.set(s.id, s));

  const requirementsById = new Map();
  (state?.course_requirements || []).forEach((r) => requirementsById.set(r.id, r));

  const splitBlocksById = new Map();
  (state?.split_course_blocks || []).forEach((b) => splitBlocksById.set(b.id, b));

  return {
    classesById,
    teachersById,
    roomsById,
    subjectsById,
    requirementsById,
    splitBlocksById,
  };
}

export function formatCell(cell, indexes, dateOverride = null) {
  if (!cell || cell.kind === "empty") {
    return {
      title: "空课",
      subtitle: "",
      room: "",
      kind: "empty",
    };
  }

  const {
    teachersById = new Map(),
    roomsById = new Map(),
    subjectsById = new Map(),
    requirementsById = new Map(),
    splitBlocksById = new Map(),
    classesById = new Map(),
  } = indexes || {};

  if (cell.kind === "lesson") {
    const req = requirementsById.get(cell.requirement_id);
    if (!req) {
      return { title: "未知课程", subtitle: "", room: "", kind: "lesson" };
    }

    const subject = subjectsById.get(req.subject_id);
    const teacherId = dateOverride?.substitute_teacher_id || cell.override_teacher_id || req.teacher_id;
    const teacher = teachersById.get(teacherId);
    const roomId = dateOverride?.room_id || cell.override_room_id || req.room_id;
    const room = roomId ? roomsById.get(roomId) : null;
    const cls = classesById.get(req.class_id);

    return {
      title: subject ? subject.name : "未知科目",
      subtitle: `${teacher ? teacher.name : "未知教师"}${cls ? ` · ${cls.name}` : ""}`,
      room: room ? room.name : "",
      kind: "lesson",
      isSubstituted: Boolean(dateOverride?.substitute_teacher_id),
      substituteTeacherName: dateOverride?.substitute_teacher_id
        ? teachersById.get(dateOverride.substitute_teacher_id)?.name
        : null,
    };
  }

  if (cell.kind === "split") {
    const block = splitBlocksById.get(cell.split_block_id);
    if (!block) {
      return { title: "未知走班", subtitle: "", room: "", kind: "split" };
    }

    const groupTitles = [];
    const groupSubtitles = [];
    const groupRooms = [];

    (block.groups || []).forEach((g) => {
      const subj = subjectsById.get(g.subject_id);
      const teach = teachersById.get(g.teacher_id);
      const rm = g.room_id ? roomsById.get(g.room_id) : null;

      groupTitles.push(subj ? subj.name : "未知");
      groupSubtitles.push(teach ? teach.name : "未知");
      if (rm) groupRooms.push(rm.name);
    });

    return {
      title: groupTitles.join(" / "),
      subtitle: groupSubtitles.join(" / "),
      room: groupRooms.join(" / "),
      kind: "split",
      splitBlockId: block.id,
      sourceClassIds: block.source_class_ids || [],
    };
  }

  return { title: "未知", subtitle: "", room: "", kind: "unknown" };
}

export function applyCellMove(classSchedules, classId, source, target, indexes) {
  // Deep clone schedules
  const newSchedules = JSON.parse(JSON.stringify(classSchedules));
  const classGrid = newSchedules[classId];
  if (!classGrid) return classSchedules;

  const srcCell = classGrid[source.day]?.[source.period];
  const tgtCell = classGrid[target.day]?.[target.period];

  if (!srcCell) return classSchedules;

  // If moving a split block, move it synchronously across ALL source classes
  if (srcCell.kind === "split") {
    const block = indexes?.splitBlocksById?.get(srcCell.split_block_id);
    const sourceClasses = block?.source_class_ids || [classId];

    for (const cId of sourceClasses) {
      if (newSchedules[cId]) {
        const currentSrc = newSchedules[cId][source.day]?.[source.period];
        const currentTgt = newSchedules[cId][target.day]?.[target.period] || { kind: "empty" };

        newSchedules[cId][target.day][target.period] = currentSrc;
        newSchedules[cId][source.day][source.period] = currentTgt;
      }
    }
    return newSchedules;
  }

  // Normal cell move / swap
  classGrid[target.day][target.period] = srcCell;
  classGrid[source.day][source.period] = tgtCell || { kind: "empty" };

  return newSchedules;
}
