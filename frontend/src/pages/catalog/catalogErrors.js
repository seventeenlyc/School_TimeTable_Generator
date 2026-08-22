const CODE_COPY = {
  duplicate_course_requirement: ["重复录入", "同一班级的同一科目被重复录入"],
  duplicate_course_requirement_teachers: ["任课教师冲突", "同一班级的同一科目配置了两个不同教师"],
  teacher_double_booked: ["教师撞课", "教师同一时间被安排了多门课程"],
  room_double_booked: ["教室冲突", "教室同一时间被重复占用"],
};

const weekdayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function byId(items) {
  return new Map(asArray(items).filter((item) => item && item.id).map((item) => [item.id, item]));
}

function entityName(map, id, fallback = id) {
  return map.get(id)?.name || fallback || "未知";
}

function addTarget(targets, tab, entityId, field = "name") {
  if (!entityId || targets.some((target) => target.tab === tab && target.entityId === entityId && target.field === field)) {
    return;
  }
  targets.push({ tab, entityId, field });
}

function firstMatch(ids, map) {
  return ids.find((id) => map.has(id));
}

function positionalTarget(message, expression, items, tab, field = "name") {
  const match = message.match(expression);
  if (!match) return null;
  const index = Number(match[1]) - 1;
  const entity = items[index];
  return entity?.id ? { tab, entityId: entity.id, field } : null;
}

function resolveStringMessage(message, maps) {
  const targets = [];
  let location = "基础数据";
  const duplicateMatch = message.match(/^课程要求重复录入：\s*(.+?)\s*\/\s*(.+?)\s*$/);
  if (duplicateMatch) {
    const className = duplicateMatch[1].trim();
    const subjectName = duplicateMatch[2].trim();
    const matchingRequirements = asArray(maps.requirements).filter((requirement) =>
      entityName(maps.classMap, requirement.class_id) === className
      && entityName(maps.subjectMap, requirement.subject_id) === subjectName
    );
    matchingRequirements.forEach((requirement) => addTarget(targets, "requirements", requirement.id, "teacher_id"));
    return {
      location: `基础数据 → 课程要求 → ${className} / ${subjectName}`,
      targets,
    };
  }
  const teacherConflictMatch = message.match(/^(.+?)的(.+?)配置了两个不同的任课教师：/);
  if (teacherConflictMatch) {
    const className = teacherConflictMatch[1].trim();
    const subjectName = teacherConflictMatch[2].trim();
    const matchingRequirements = asArray(maps.requirements).filter((requirement) =>
      entityName(maps.classMap, requirement.class_id) === className
      && entityName(maps.subjectMap, requirement.subject_id) === subjectName
    );
    matchingRequirements.forEach((requirement) => addTarget(targets, "requirements", requirement.id, "teacher_id"));
    return {
      location: `基础数据 → 课程要求 → ${className} / ${subjectName}`,
      targets,
    };
  }
  const requirementTarget = positionalTarget(message, /课程要求\s*#\s*(\d+)/, maps.requirements, "requirements", "class_id");
  const teacherTarget = positionalTarget(message, /教师\s*#\s*(\d+)/, maps.teachers, "teachers");
  const classTarget = positionalTarget(message, /班级\s*#\s*(\d+)/, maps.classes, "classes");
  const splitTarget = positionalTarget(message, /走班(?:课程)?块\s*#\s*(\d+)/, maps.splitBlocks, "split_blocks");
  if (requirementTarget) {
    targets.push(requirementTarget);
    location = `基础数据 → 课程要求 → ${requirementLabel(maps.requirementMap.get(requirementTarget.entityId), maps)}`;
  } else if (teacherTarget) {
    targets.push(teacherTarget);
    location = `基础数据 → 教师 → ${entityName(maps.teacherMap, teacherTarget.entityId)}`;
  } else if (classTarget) {
    targets.push(classTarget);
    location = `基础数据 → 班级 → ${entityName(maps.classMap, classTarget.entityId)}`;
  } else if (splitTarget) {
    targets.push(splitTarget);
    location = `基础数据 → 走班课程 → ${entityName(maps.splitMap, splitTarget.entityId)}`;
  } else {
    const quotedTeacher = message.match(/教师\s*[“"]([^”"]+)[”"]/)?.[1];
    const teacher = asArray(maps.teachers).find((item) => item?.name === quotedTeacher);
    if (teacher) {
      addTarget(targets, "teachers", teacher.id, "name");
      location = `基础数据 → 教师 → ${teacher.name}`;
    }
  }
  return { location, targets };
}

function requirementLabel(requirement, maps) {
  if (!requirement) return "";
  return `${entityName(maps.classMap, requirement.class_id)} / ${entityName(maps.subjectMap, requirement.subject_id)}`;
}

function collectScheduleEntities(ids, maps) {
  const classIds = [];
  const teacherIds = [];
  const requirementIds = [];
  const splitBlockIds = [];
  ids.forEach((id) => {
    if (maps.classMap.has(id)) classIds.push(id);
    if (maps.teacherMap.has(id)) teacherIds.push(id);
    if (maps.requirementMap.has(id)) requirementIds.push(id);
  });
  requirementIds.forEach((id) => {
    const requirement = maps.requirementMap.get(id);
    if (requirement?.class_id) classIds.push(requirement.class_id);
    if (requirement?.teacher_id) teacherIds.push(requirement.teacher_id);
  });
  asArray(maps.splitBlocks).forEach((block) => {
    const blockSelected = ids.includes(String(block.id));
    const selectedGroups = asArray(block.groups).filter((group) => ids.includes(String(group?.id)));
    if (!blockSelected && selectedGroups.length === 0) return;
    if (block.id) splitBlockIds.push(block.id);
    asArray(block.source_class_ids).forEach((id) => classIds.push(id));
    const groups = blockSelected ? asArray(block.groups) : selectedGroups;
    groups.forEach((group) => {
      if (group?.teacher_id) teacherIds.push(group.teacher_id);
    });
  });
  return {
    classIds: [...new Set(classIds)],
    teacherIds: [...new Set(teacherIds)],
    requirementIds: [...new Set(requirementIds)],
    splitBlockIds: [...new Set(splitBlockIds)],
  };
}

function scheduleContext(detail, ids, maps) {
  const { classIds, teacherIds, requirementIds, splitBlockIds } = collectScheduleEntities(ids, maps);
  const versionId = firstMatch(ids, maps.versionMap);
  const parts = [];
  if (versionId) parts.push(entityName(maps.versionMap, versionId));
  const weekday = Number(detail.weekday);
  const period = Number(detail.period);
  if (Number.isFinite(weekday) && Number.isFinite(period)) {
    parts.push(`${weekdayNames[weekday] || `星期${weekday + 1}`}第${period + 1}节`);
  }
  teacherIds.forEach((id) => parts.push(entityName(maps.teacherMap, id)));
  if (classIds.length) {
    parts.push(classIds.map((id) => entityName(maps.classMap, id)).join("、"));
  }
  return { classIds, teacherIds, requirementIds, splitBlockIds, location: parts.length ? `基础数据 → 课表 → ${parts.join(" → ")}` : "基础数据 → 课表" };
}

function resolveCodeDetail(detail, maps) {
  const code = detail.code;
  const ids = asArray(detail.entity_ids).map(String);
  const targets = [];
  const requirementIds = ids.filter((id) => maps.requirementMap.has(id));
  const classId = firstMatch(ids, maps.classMap);
  const subjectId = firstMatch(ids, maps.subjectMap);
  const teacherId = firstMatch(ids, maps.teacherMap);
  const roomId = firstMatch(ids, maps.roomMap);
  const blockId = firstMatch(ids, maps.splitMap);
  const versionId = firstMatch(ids, maps.versionMap);

  if (code === "duplicate_course_requirement" || code === "duplicate_course_requirement_teachers") {
    let requirements = requirementIds.map((id) => maps.requirementMap.get(id));
    if (requirements.length === 0 && classId && subjectId) {
      requirements = asArray(maps.requirements).filter((item) => item.class_id === classId && item.subject_id === subjectId);
    }
    requirements.forEach((requirement) => addTarget(targets, "requirements", requirement.id, "teacher_id"));
    const firstRequirement = requirements[0];
    const resolvedClass = firstRequirement?.class_id || classId;
    const resolvedSubject = firstRequirement?.subject_id || subjectId;
    const location = resolvedClass || resolvedSubject
      ? `基础数据 → 课程要求 → ${entityName(maps.classMap, resolvedClass)} / ${entityName(maps.subjectMap, resolvedSubject)}`
      : "基础数据 → 课程要求";
    return { location, targets };
  }

  if (code === "teacher_double_booked") {
    const context = scheduleContext(detail, ids, maps);
    context.teacherIds.forEach((id) => addTarget(targets, "teachers", id, "name"));
    context.classIds.forEach((id) => addTarget(targets, "classes", id, "name"));
    context.requirementIds.forEach((id) => addTarget(targets, "requirements", id, "teacher_id"));
    context.splitBlockIds.forEach((id) => addTarget(targets, "split_blocks", id, "name"));
    return { location: context.location, targets };
  }

  if (code === "room_double_booked") {
    if (roomId) addTarget(targets, "rooms", roomId, "name");
    const context = scheduleContext(detail, ids, maps);
    context.teacherIds.forEach((id) => addTarget(targets, "teachers", id, "name"));
    context.classIds.forEach((id) => addTarget(targets, "classes", id, "name"));
    context.requirementIds.forEach((id) => addTarget(targets, "requirements", id, "class_id"));
    context.splitBlockIds.forEach((id) => addTarget(targets, "split_blocks", id, "name"));
    const location = roomId ? `${context.location} → ${entityName(maps.roomMap, roomId)}` : context.location;
    return { location, targets };
  }

  const targetDefinitions = [
    ["teachers", teacherId, "teachers", "name"],
    ["classes", classId, "classes", "name"],
    ["rooms", roomId, "rooms", "name"],
    ["subjects", subjectId, "subjects", "name"],
    ["requirements", requirementIds[0], "requirements", "class_id"],
    ["split_blocks", blockId, "split_blocks", "name"],
  ];
  targetDefinitions.forEach(([, entityId, tab, , field]) => addTarget(targets, tab, entityId, field));
  if (versionId || detail.weekday !== undefined || detail.period !== undefined) {
    const context = scheduleContext(detail, ids, maps);
    context.teacherIds.forEach((id) => addTarget(targets, "teachers", id, "name"));
    context.classIds.forEach((id) => addTarget(targets, "classes", id, "name"));
    context.requirementIds.forEach((id) => addTarget(targets, "requirements", id, "class_id"));
    context.splitBlockIds.forEach((id) => addTarget(targets, "split_blocks", id, "name"));
    return { location: context.location, targets };
  }
  if (blockId) return { location: `基础数据 → 走班课程 → ${entityName(maps.splitMap, blockId)}`, targets };
  if (requirementIds[0]) return { location: `基础数据 → 课程要求 → ${requirementLabel(maps.requirementMap.get(requirementIds[0]), maps)}`, targets };
  if (teacherId) return { location: `基础数据 → 教师 → ${entityName(maps.teacherMap, teacherId)}`, targets };
  if (classId) return { location: `基础数据 → 班级 → ${entityName(maps.classMap, classId)}`, targets };
  return { location: "基础数据", targets };
}

export function buildCatalogErrorDetails(form = {}, messagesOrDetails = []) {
  const source = Array.isArray(messagesOrDetails) ? messagesOrDetails : [messagesOrDetails];
  const maps = {
    classes: asArray(form.classes),
    teachers: asArray(form.teachers),
    requirements: asArray(form.course_requirements),
    splitBlocks: asArray(form.split_course_blocks),
    classMap: byId(form.classes),
    subjectMap: byId(form.subjects),
    teacherMap: byId(form.teachers),
    roomMap: byId(form.rooms),
    requirementMap: byId(form.course_requirements),
    splitMap: byId(form.split_course_blocks),
    versionMap: byId(form.timetable_versions || form.timetableVersions),
    subjects: asArray(form.subjects),
  };

  return source.filter((entry) => entry !== undefined && entry !== null).map((entry) => {
    const detail = typeof entry === "string" ? { message: entry } : { ...entry };
    const code = detail.code;
    const copy = CODE_COPY[code];
    const message = detail.message || copy?.[1] || "请求失败";
    const resolved = code ? resolveCodeDetail({ ...detail, message }, maps) : resolveStringMessage(message, maps);
    return {
      ...detail,
      code,
      title: detail.title || copy?.[0] || "数据校验提示",
      message,
      location: resolved.location,
      targets: resolved.targets,
    };
  });
}
