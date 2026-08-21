export function createId(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

export function catalogFromState(state) {
  return {
    classes: state?.classes || [],
    teachers: state?.teachers || [],
    rooms: state?.rooms || [],
    subjects: state?.subjects || [],
    course_requirements: state?.course_requirements || [],
    split_course_blocks: state?.split_course_blocks || [],
  };
}

export function validateCatalogForm(form) {
  const errors = [];

  // 1. Check duplicate class names
  const classNames = new Set();
  (form.classes || []).forEach((c) => {
    if (!c.name?.trim()) errors.push(`班级名称不能为空`);
    else if (classNames.has(c.name.trim())) errors.push(`班级名称重复: ${c.name}`);
    classNames.add(c.name.trim());
  });

  // 2. Check duplicate teacher names
  const teacherNames = new Set();
  (form.teachers || []).forEach((t) => {
    if (!t.name?.trim()) errors.push(`教师名称不能为空`);
    else if (teacherNames.has(t.name.trim())) errors.push(`教师姓名重复: ${t.name}`);
    teacherNames.add(t.name.trim());
  });

  // 3. Check split blocks
  (form.split_course_blocks || []).forEach((block, idx) => {
    if (!block.source_class_ids || block.source_class_ids.length < 2) {
      errors.push(`走班课程块 #${idx + 1} 至少需要 2 个来源班级`);
    }
    if (!block.groups || block.groups.length < 2) {
      errors.push(`走班课程块 #${idx + 1} 至少需要 2 个分组科目/教师`);
    }
  });

  return errors;
}

export function buildCatalogPayload(form, baseRevision) {
  return {
    base_revision: baseRevision,
    classes: form.classes || [],
    teachers: form.teachers || [],
    rooms: form.rooms || [],
    subjects: form.subjects || [],
    course_requirements: form.course_requirements || [],
    split_course_blocks: form.split_course_blocks || [],
  };
}
