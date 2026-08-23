import { createId, validateCatalogForm } from "./catalogState";

const SUMMARY_KEYS = ["classes", "subjects", "rooms", "teachers", "courseRequirements"];

function emptyCreated() {
  return SUMMARY_KEYS.reduce((created, key) => {
    created[key] = [];
    return created;
  }, {});
}

function emptyCounts() {
  return SUMMARY_KEYS.reduce((counts, key) => {
    counts[key] = 0;
    return counts;
  }, {});
}

function emptySummary(skipped = 0) {
  return {
    added: emptyCounts(),
    updated: emptyCounts(),
    skipped: Number.isFinite(Number(skipped)) ? Number(skipped) : 0,
  };
}

function normalizedName(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function cloneFixedSlots(slots) {
  return Array.isArray(slots) ? slots.map((slot) => ({ ...slot })) : [];
}

function cloneTeacher(teacher) {
  const cloned = { ...teacher };
  if (Array.isArray(teacher?.qualified_subject_ids)) {
    cloned.qualified_subject_ids = [...teacher.qualified_subject_ids];
  }
  if (Array.isArray(teacher?.weekly_unavailable_slots)) {
    cloned.weekly_unavailable_slots = cloneFixedSlots(teacher.weekly_unavailable_slots);
  }
  if (Array.isArray(teacher?.teaching_assignment_ids)) {
    cloned.teaching_assignment_ids = [...teacher.teaching_assignment_ids];
  }
  return cloned;
}

function cloneRequirement(requirement) {
  const cloned = { ...requirement };
  if (Array.isArray(requirement?.fixed_slots)) {
    cloned.fixed_slots = cloneFixedSlots(requirement.fixed_slots);
  }
  return cloned;
}

function cloneCatalogForm(form) {
  return {
    ...form,
    settings: form?.settings ? { ...form.settings } : form?.settings,
    classes: Array.isArray(form?.classes) ? form.classes.map((item) => ({ ...item })) : [],
    subjects: Array.isArray(form?.subjects) ? form.subjects.map((item) => ({ ...item })) : [],
    rooms: Array.isArray(form?.rooms) ? form.rooms.map((item) => ({ ...item })) : [],
    teachers: Array.isArray(form?.teachers) ? form.teachers.map(cloneTeacher) : [],
    course_requirements: Array.isArray(form?.course_requirements)
      ? form.course_requirements.map(cloneRequirement)
      : [],
    split_course_blocks: Array.isArray(form?.split_course_blocks)
      ? form.split_course_blocks.map((block) => ({
          ...block,
          ...(Array.isArray(block.source_class_ids)
            ? { source_class_ids: [...block.source_class_ids] }
            : {}),
          ...(Array.isArray(block.groups)
            ? { groups: block.groups.map((group) => ({ ...group })) }
            : {}),
        }))
      : [],
    timetable_versions: Array.isArray(form?.timetable_versions)
      ? form.timetable_versions.map((version) => ({ ...version }))
      : form?.timetable_versions,
  };
}

function buildNameMap(collection) {
  const map = new Map();
  collection.forEach((item) => {
    const name = normalizedName(item?.name);
    if (name && !map.has(name)) map.set(name, item);
  });
  return map;
}

function mergeError(message) {
  return {
    fileType: "merge",
    fileName: "",
    sheetName: "",
    row: null,
    column: "",
    value: null,
    message: String(message || "导入后的基础数据校验失败"),
  };
}

/**
 * Plan an all-or-nothing merge of parser rows into the local catalog draft.
 * No persistence or browser I/O happens here; callers can apply nextForm only
 * after checking errors.
 */
export function planCatalogImport(form, parsed, options = {}) {
  const skipped = parsed?.skipped ?? 0;
  const parserErrors = Array.isArray(parsed?.errors) ? parsed.errors : [];
  if (parserErrors.length) {
    return {
      nextForm: form,
      summary: emptySummary(skipped),
      errors: parserErrors,
      created: emptyCreated(),
    };
  }

  const makeId = options.createId || createId;
  const nextForm = cloneCatalogForm(form || {});
  const summary = emptySummary(skipped);
  const created = emptyCreated();
  const maps = {
    classes: buildNameMap(nextForm.classes),
    subjects: buildNameMap(nextForm.subjects),
    rooms: buildNameMap(nextForm.rooms),
    teachers: buildNameMap(nextForm.teachers),
  };

  const markUpdated = (key) => {
    summary.updated[key] += 1;
  };

  const ensureNamedEntity = (collectionKey, prefix, rawName) => {
    const name = normalizedName(rawName);
    if (!name) return null;

    const existing = maps[collectionKey].get(name);
    if (existing) return existing;

    const id = makeId(prefix);
    const entity = collectionKey === "teachers"
      ? {
          id,
          name,
          qualified_subject_ids: [],
          teaching_assignment_ids: [],
          weekly_unavailable_slots: [],
          homeroom_class_id: null,
          main_subject_id: null,
        }
      : { id, name };

    nextForm[collectionKey].unshift(entity);
    maps[collectionKey].set(name, entity);
    summary.added[collectionKey] += 1;
    created[collectionKey].push(id);
    return entity;
  };

  const teacherRows = Array.isArray(parsed?.teacherRows) ? parsed.teacherRows : [];
  const requirementRows = Array.isArray(parsed?.requirementRows) ? parsed.requirementRows : [];

  teacherRows.forEach((row) => {
    const teacher = ensureNamedEntity("teachers", "teacher", row?.name);
    const subject = ensureNamedEntity("subjects", "subject", row?.mainSubjectName);
    const homeroomName = normalizedName(row?.homeroomClassName);
    const homeroom = homeroomName
      ? ensureNamedEntity("classes", "class", homeroomName)
      : null;
    if (!teacher || !subject) return;

    let changed = false;
    if (!Array.isArray(teacher.qualified_subject_ids)) {
      teacher.qualified_subject_ids = [];
      changed = true;
    }
    if (!teacher.qualified_subject_ids.includes(subject.id)) {
      teacher.qualified_subject_ids.push(subject.id);
      changed = true;
    }
    if (homeroom && teacher.homeroom_class_id !== homeroom.id) {
      teacher.homeroom_class_id = homeroom.id;
      changed = true;
    }
    if (subject.id && teacher.main_subject_id !== subject.id) {
      teacher.main_subject_id = subject.id;
      changed = true;
    }
    if (changed && !created.teachers.includes(teacher.id)) markUpdated("teachers");
  });

  requirementRows.forEach((row) => {
    const classEntity = ensureNamedEntity("classes", "class", row?.className);
    const subjectEntity = ensureNamedEntity("subjects", "subject", row?.subjectName);
    const teacherEntity = ensureNamedEntity("teachers", "teacher", row?.teacherName);
    const roomName = normalizedName(row?.roomName);
    const roomEntity = roomName ? ensureNamedEntity("rooms", "room", roomName) : null;
    if (!classEntity || !subjectEntity || !teacherEntity) return;

    if (!Array.isArray(teacherEntity.qualified_subject_ids)) {
      teacherEntity.qualified_subject_ids = [];
    }
    if (!teacherEntity.qualified_subject_ids.includes(subjectEntity.id)) {
      teacherEntity.qualified_subject_ids.push(subjectEntity.id);
      if (!created.teachers.includes(teacherEntity.id)) markUpdated("teachers");
    }

    const existingIndex = nextForm.course_requirements.findIndex((requirement) => (
      requirement.class_id === classEntity.id && requirement.subject_id === subjectEntity.id
    ));
    const fixedSlots = cloneFixedSlots(row?.fixedSlots);
    const importedValues = {
      teacher_id: teacherEntity.id,
      room_id: roomEntity?.id ?? null,
      periods_per_week: row?.periodsPerWeek,
      fixed_slots: fixedSlots,
    };

    if (existingIndex >= 0) {
      const existing = nextForm.course_requirements[existingIndex];
      nextForm.course_requirements[existingIndex] = {
        ...existing,
        ...importedValues,
        consecutive_periods: existing.consecutive_periods ?? 1,
      };
      markUpdated("courseRequirements");
      return;
    }

    const id = makeId("req");
    nextForm.course_requirements.unshift({
      id,
      class_id: classEntity.id,
      subject_id: subjectEntity.id,
      ...importedValues,
      consecutive_periods: 1,
    });
    summary.added.courseRequirements += 1;
    created.courseRequirements.push(id);
  });

  const validationErrors = validateCatalogForm(nextForm);
  if (validationErrors.length) {
    return {
      nextForm: form,
      summary: emptySummary(skipped),
      errors: validationErrors.map(mergeError),
      created: emptyCreated(),
    };
  }

  return { nextForm, summary, errors: [], created };
}
