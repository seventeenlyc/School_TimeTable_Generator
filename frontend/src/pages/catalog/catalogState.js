export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export function catalogFromState(state) {
  return {
    settings: state?.settings || {
      working_days: 5,
      periods_per_day: 8,
    },
    classes: state?.classes ? state.classes.map((c) => ({ ...c })) : [],
    teachers: state?.teachers
      ? state.teachers.map((t) => ({
          ...t,
          qualified_subject_ids: t.qualified_subject_ids ? [...t.qualified_subject_ids] : [],
          homeroom_class_id: t.homeroom_class_id ?? null,
          main_subject_id: t.main_subject_id ?? null,
          weekly_unavailable_slots: t.weekly_unavailable_slots
            ? t.weekly_unavailable_slots.map((s) => ({ ...s }))
            : [],
        }))
      : [],
    rooms: state?.rooms ? state.rooms.map((r) => ({ ...r })) : [],
    subjects: state?.subjects ? state.subjects.map((s) => ({ ...s })) : [],
    course_requirements: state?.course_requirements
      ? state.course_requirements.map((cr) => ({
          ...cr,
          id: cr.id || cr.course_requirement_id || createId("cr"),
          room_id: cr.room_id ?? null,
          consecutive_periods: cr.consecutive_periods ?? 1,
          fixed_slots: Array.isArray(cr.fixed_slots)
            ? cr.fixed_slots.map((s) => ({ weekday: Number(s.weekday), period: Number(s.period) }))
            : [],
        }))
      : [],
    split_course_blocks: state?.split_course_blocks
      ? state.split_course_blocks.map((b) => ({
          ...b,
          id: b.id || createId("split"),
          source_class_ids: b.source_class_ids ? [...b.source_class_ids] : [],
          groups: b.groups ? b.groups.map((g) => ({ ...g })) : [],
        }))
      : [],
    timetable_versions: state?.timetable_versions
      ? state.timetable_versions.map((version) => ({ ...version }))
      : [],
  };
}

export function validateCatalogForm(form, explicitSettings) {
  const errors = [];
  if (!form) return ["表单数据无效"];

  const classes = form.classes || [];
  const teachers = form.teachers || [];
  const rooms = form.rooms || [];
  const subjects = form.subjects || [];
  const courseRequirements = form.course_requirements || [];
  const splitCourseBlocks = form.split_course_blocks || [];

  const settings = explicitSettings || form.settings || {};
  const workingDays = typeof settings.working_days === "number" && settings.working_days > 0 ? settings.working_days : 5;
  const periodsPerDay = typeof settings.periods_per_day === "number" && settings.periods_per_day > 0 ? settings.periods_per_day : 8;
  const maxWeeklyPeriods = workingDays * periodsPerDay;

  const classMap = new Map();
  const classNameSet = new Set();
  classes.forEach((c, idx) => {
    const name = c.name?.trim();
    if (!name) {
      errors.push(`班级 #${idx + 1} 名称不能为空`);
    } else if (classNameSet.has(name)) {
      errors.push(`班级名称重复: ${name}`);
    } else {
      classNameSet.add(name);
    }
    if (c.id) {
      classMap.set(c.id, c);
    }
  });

  const subjectMap = new Map();
  subjects.forEach((s) => {
    if (s.id) {
      subjectMap.set(s.id, s);
    }
  });

  const roomMap = new Map();
  rooms.forEach((r) => {
    if (r.id) {
      roomMap.set(r.id, r);
    }
  });

  const teacherMap = new Map();
  const teacherNameSet = new Set();
  teachers.forEach((t, idx) => {
    const name = t.name?.trim();
    if (!name) {
      errors.push(`教师 #${idx + 1} 名称不能为空`);
    } else if (teacherNameSet.has(name)) {
      errors.push(`教师姓名重复: ${name}`);
    } else {
      teacherNameSet.add(name);
    }
    if (t.id) {
      teacherMap.set(t.id, t);
    }

    const qualSubjects = t.qualified_subject_ids || [];
    if (qualSubjects.length === 0) {
      errors.push(`教师 "${t.name || `#${idx + 1}`}" 必须至少设置一个资质科目`);
    } else {
      qualSubjects.forEach((subId) => {
        if (!subjectMap.has(subId)) {
          errors.push(`教师 "${t.name || `#${idx + 1}`}" 包含不存在的资质科目: ${subId}`);
        }
      });
    }

    if (t.homeroom_class_id && !classMap.has(t.homeroom_class_id)) {
      errors.push(`教师 "${t.name || `#${idx + 1}`}" 关联的班主任班级不存在: ${t.homeroom_class_id}`);
    }
    if (t.main_subject_id && !subjectMap.has(t.main_subject_id)) {
      errors.push(`教师 "${t.name || `#${idx + 1}`}" 关联的主科目不存在: ${t.main_subject_id}`);
    }
  });

  const requirementsByClassSubject = new Map();
  courseRequirements.forEach((req) => {
    const key = `${req.class_id}\u0000${req.subject_id}`;
    const list = requirementsByClassSubject.get(key) || [];
    list.push(req);
    requirementsByClassSubject.set(key, list);
  });
  for (const duplicates of requirementsByClassSubject.values()) {
    if (duplicates.length < 2) continue;
    const className = classMap.get(duplicates[0].class_id)?.name || duplicates[0].class_id;
    const subjectName = subjectMap.get(duplicates[0].subject_id)?.name || duplicates[0].subject_id;
    const teacherNames = [...new Set(duplicates.map((req) =>
      teacherMap.get(req.teacher_id)?.name || req.teacher_id
    ))];
    errors.push(
      teacherNames.length > 1
        ? `${className}的${subjectName}配置了两个不同的任课教师：${teacherNames.join("、")}`
        : `课程要求重复录入：${className} / ${subjectName}`
    );
  }

  // Course Requirements validation
  courseRequirements.forEach((req, idx) => {
    const reqDesc = `课程要求 #${idx + 1}`;

    if (!req.class_id || !classMap.has(req.class_id)) {
      errors.push(`${reqDesc} 引用的班级不存在: ${req.class_id}`);
    }

    if (!req.subject_id || !subjectMap.has(req.subject_id)) {
      errors.push(`${reqDesc} 引用的科目不存在: ${req.subject_id}`);
    }

    if (!req.teacher_id || !teacherMap.has(req.teacher_id)) {
      errors.push(`${reqDesc} 引用的教师不存在: ${req.teacher_id}`);
    } else if (req.subject_id && subjectMap.has(req.subject_id)) {
      const teacher = teacherMap.get(req.teacher_id);
      const qualSubjects = teacher.qualified_subject_ids || [];
      if (!qualSubjects.includes(req.subject_id)) {
        const subName = subjectMap.get(req.subject_id)?.name || req.subject_id;
        errors.push(`教师 "${teacher.name}" 不具备科目 "${subName}" 的教学资质`);
      }
    }

    if (req.room_id && !roomMap.has(req.room_id)) {
      errors.push(`${reqDesc} 引用的教室不存在: ${req.room_id}`);
    }

    const periodsPerWeek = req.periods_per_week;
    if (typeof periodsPerWeek !== "number" || periodsPerWeek <= 0) {
      errors.push(`${reqDesc} 周课时必须为正整数`);
    } else if (periodsPerWeek > maxWeeklyPeriods) {
      errors.push(`${reqDesc} 周课时 (${periodsPerWeek}) 超过每周最大可用课时 (${maxWeeklyPeriods})`);
    }

    const consecutive = req.consecutive_periods ?? 1;
    if (typeof consecutive !== "number" || consecutive < 1) {
      errors.push(`${reqDesc} 连节数必须为大于等于 1 的整数`);
    } else {
      if (typeof periodsPerWeek === "number" && consecutive > periodsPerWeek) {
        errors.push(`${reqDesc} 连节数 (${consecutive}) 不能大于周课时 (${periodsPerWeek})`);
      }
      if (consecutive > periodsPerDay) {
        errors.push(`${reqDesc} 连节数 (${consecutive}) 不能大于日课时 (${periodsPerDay})`);
      }
    }

    const fixedSlots = Array.isArray(req.fixed_slots) ? req.fixed_slots : [];
    if (fixedSlots.length > 0) {
      if (consecutive !== 1) {
        errors.push(`${reqDesc} 固定时间仅支持单节课程 (连续节次必须为 1)`);
      }
      if (typeof periodsPerWeek === "number" && fixedSlots.length > periodsPerWeek) {
        errors.push(`${reqDesc} 固定时间数量 (${fixedSlots.length}) 超过周课时 (${periodsPerWeek})`);
      }
      const seenSlots = new Set();
      fixedSlots.forEach((slot, sIdx) => {
        const slotDesc = `${reqDesc} 固定时间 #${sIdx + 1}`;
        const w = Number(slot.weekday);
        const p = Number(slot.period);
        if (isNaN(w) || w < 0 || w >= workingDays) {
          errors.push(`${slotDesc} 星期超出有效范围 (0..${workingDays - 1})`);
        }
        if (isNaN(p) || p < 0 || p >= periodsPerDay) {
          errors.push(`${slotDesc} 节次超出有效范围 (0..${periodsPerDay - 1})`);
        }
        const key = `${w}-${p}`;
        if (seenSlots.has(key)) {
          errors.push(`${reqDesc} 存在重复的固定时间: 星期 ${w + 1} 第 ${p + 1} 节`);
        }
        seenSlots.add(key);
      });
    }
  });

  // Split Course Blocks validation
  splitCourseBlocks.forEach((block, idx) => {
    const blockDesc = `走班课程块 #${idx + 1}`;

    const blockName = block.name?.trim();
    if (!blockName) {
      errors.push(`${blockDesc} 名称不能为空`);
    }

    const sourceClassIds = block.source_class_ids || [];
    if (sourceClassIds.length < 2) {
      errors.push(`${blockDesc} 至少需要 2 个来源班级`);
    } else {
      const seenSources = new Set();
      sourceClassIds.forEach((cId) => {
        if (!classMap.has(cId)) {
          errors.push(`${blockDesc} 包含不存在的来源班级: ${cId}`);
        }
        if (seenSources.has(cId)) {
          errors.push(`${blockDesc} 包含重复的来源班级: ${cId}`);
        }
        seenSources.add(cId);
      });
    }

    const periodsPerWeek = block.periods_per_week;
    if (typeof periodsPerWeek !== "number" || periodsPerWeek <= 0) {
      errors.push(`${blockDesc} 周课时必须为正整数`);
    } else if (periodsPerWeek > maxWeeklyPeriods) {
      errors.push(`${blockDesc} 周课时 (${periodsPerWeek}) 超过每周最大可用课时 (${maxWeeklyPeriods})`);
    }

    const groups = block.groups || [];
    if (groups.length < 2) {
      errors.push(`${blockDesc} 至少需要 2 个分组科目/教师`);
    } else {
      const groupSubjSet = new Set();
      const groupTeacherSet = new Set();
      const groupRoomSet = new Set();

      groups.forEach((g, gIdx) => {
        const groupDesc = `${blockDesc} 分组 #${gIdx + 1}`;

        if (!g.subject_id || !g.teacher_id || !g.room_id) {
          errors.push(`${groupDesc} 信息不完整，必须填写科目、教师和教室`);
        }

        if (g.subject_id) {
          if (!subjectMap.has(g.subject_id)) {
            errors.push(`${groupDesc} 引用的科目不存在: ${g.subject_id}`);
          }
          if (groupSubjSet.has(g.subject_id)) {
            errors.push(`${blockDesc} 存在重复的分组科目: ${subjectMap.get(g.subject_id)?.name || g.subject_id}`);
          }
          groupSubjSet.add(g.subject_id);
        }

        if (g.teacher_id) {
          if (!teacherMap.has(g.teacher_id)) {
            errors.push(`${groupDesc} 引用的教师不存在: ${g.teacher_id}`);
          } else {
            const teacher = teacherMap.get(g.teacher_id);
            if (g.subject_id && subjectMap.has(g.subject_id)) {
              const qualSubjects = teacher.qualified_subject_ids || [];
              if (!qualSubjects.includes(g.subject_id)) {
                const subName = subjectMap.get(g.subject_id)?.name || g.subject_id;
                errors.push(`教师 "${teacher.name}" 不具备走班科目 "${subName}" 的教学资质`);
              }
            }
          }

          if (groupTeacherSet.has(g.teacher_id)) {
            errors.push(`${blockDesc} 存在重复的分组教师: ${teacherMap.get(g.teacher_id)?.name || g.teacher_id}`);
          }
          groupTeacherSet.add(g.teacher_id);
        }

        if (g.room_id) {
          if (!roomMap.has(g.room_id)) {
            errors.push(`${groupDesc} 引用的教室不存在: ${g.room_id}`);
          }
          if (groupRoomSet.has(g.room_id)) {
            errors.push(`${blockDesc} 存在重复的分组教室: ${roomMap.get(g.room_id)?.name || g.room_id}`);
          }
          groupRoomSet.add(g.room_id);
        }
      });
    }
  });

  return errors;
}

export function buildCatalogPayload(form, baseRevision) {
  const reqs = form.course_requirements || [];

  // Build teacherId -> [req_id] mapping preserving order of course_requirements
  const teacherAssignmentMap = new Map();
  reqs.forEach((cr) => {
    if (cr.teacher_id && cr.id) {
      if (!teacherAssignmentMap.has(cr.teacher_id)) {
        teacherAssignmentMap.set(cr.teacher_id, []);
      }
      teacherAssignmentMap.get(cr.teacher_id).push(cr.id);
    }
  });

  const teachers = (form.teachers || []).map((t) => {
    const qualifiedSubjectIds = Array.isArray(t.qualified_subject_ids)
      ? [...t.qualified_subject_ids]
      : [];
    const weeklyUnavailableSlots = Array.isArray(t.weekly_unavailable_slots)
      ? t.weekly_unavailable_slots.map((s) => ({ weekday: s.weekday, period: s.period }))
      : [];

    return {
      id: t.id,
      name: t.name,
      qualified_subject_ids: qualifiedSubjectIds,
      homeroom_class_id: t.homeroom_class_id ?? null,
      main_subject_id: t.main_subject_id ?? null,
      weekly_unavailable_slots: weeklyUnavailableSlots,
      teaching_assignment_ids: teacherAssignmentMap.get(t.id) || [],
    };
  });

  const classes = (form.classes || []).map((c) => ({
    id: c.id,
    name: c.name,
  }));

  const rooms = (form.rooms || []).map((r) => ({
    id: r.id,
    name: r.name,
    capacity: r.capacity,
  }));

  const subjects = (form.subjects || []).map((s) => ({
    id: s.id,
    name: s.name,
  }));

  const courseRequirements = reqs.map((cr) => ({
    id: cr.id,
    class_id: cr.class_id,
    subject_id: cr.subject_id,
    teacher_id: cr.teacher_id,
    room_id: cr.room_id ?? null,
    periods_per_week: cr.periods_per_week,
    consecutive_periods: cr.consecutive_periods ?? 1,
    fixed_slots: Array.isArray(cr.fixed_slots)
      ? cr.fixed_slots.map((s) => ({ weekday: Number(s.weekday), period: Number(s.period) }))
      : [],
  }));

  const splitCourseBlocks = (form.split_course_blocks || []).map((b) => ({
    id: b.id,
    name: b.name,
    source_class_ids: Array.isArray(b.source_class_ids) ? [...b.source_class_ids] : [],
    periods_per_week: b.periods_per_week,
    groups: Array.isArray(b.groups)
      ? b.groups.map((g) => ({
          id: g.id,
          subject_id: g.subject_id,
          teacher_id: g.teacher_id,
          room_id: g.room_id,
        }))
      : [],
  }));

  return {
    base_revision: baseRevision,
    classes,
    teachers,
    rooms,
    subjects,
    course_requirements: courseRequirements,
    split_course_blocks: splitCourseBlocks,
  };
}
