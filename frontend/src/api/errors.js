const CODE_COPY = {
  duplicate_course_requirement: ["重复录入", "同一班级的同一科目被重复录入"],
  duplicate_course_requirement_teachers: ["任课教师冲突", "同一班级的同一科目配置了两个不同教师"],
  teacher_double_booked: ["教师撞课", "教师同一时间被安排了多门课程"],
  room_double_booked: ["教室冲突", "同一教室在同一时间被重复占用"],
  teacher_unavailable: ["教师不可用", "课程安排在教师设置的不可用时间"],
  revision_conflict: ["数据版本冲突", "数据已被更新，请重新加载后再保存"],
  generation_failed: ["排课计算失败", "当前约束无法生成可行课表"],
  schedule_validation_failed: ["数据不合法", "课表或基础数据校验未通过"],
};

const COLLECTION_KEYS = ["errors", "issues", "diagnostics"];
const MAX_RAW_LENGTH = 2000;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function safeString(value) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value);
  }
  if (value instanceof Error && typeof value.message === "string") return value.message;
  return "";
}

function safeFallback(value) {
  const message = safeString(value).trim();
  return message || "请求失败";
}

function boundedRaw(value) {
  try {
    const serialized = JSON.stringify(value);
    if (typeof serialized !== "string") return undefined;
    return serialized.length > MAX_RAW_LENGTH
      ? `${serialized.slice(0, MAX_RAW_LENGTH)}…`
      : serialized;
  } catch {
    return undefined;
  }
}

function hasCollection(source) {
  return isRecord(source) && COLLECTION_KEYS.some((key) => source[key] !== undefined);
}

function copyLocationFields(entry, detail) {
  for (const key of ["entity_ids", "weekday", "period"]) {
    if (Object.prototype.hasOwnProperty.call(entry, key)) detail[key] = entry[key];
  }
}

function normalizeEntry(entry, parentCode, fallbackMessage) {
  if (typeof entry === "string") {
    const detail = { message: entry };
    if (parentCode) detail.code = parentCode;
    return detail;
  }

  if (entry === null || entry === undefined) {
    return { message: fallbackMessage };
  }

  if (!isRecord(entry)) {
    const message = safeString(entry) || fallbackMessage;
    return { message };
  }

  const code = safeString(entry.code) || parentCode || undefined;
  const copy = code ? CODE_COPY[code] : undefined;
  const explicitMessage = safeString(entry.message).trim() || safeString(entry.detail).trim();
  const detail = {};

  if (code) detail.code = code;
  if (copy) detail.title = copy[0];
  else if (safeString(entry.title)) detail.title = safeString(entry.title);

  detail.message = copy?.[1] || explicitMessage || (code ? `${fallbackMessage}（${code}）` : fallbackMessage);
  copyLocationFields(entry, detail);

  const raw = boundedRaw(entry);
  if (raw !== undefined) detail.raw = raw;
  return detail;
}

function flattenCollection(value, parentCode, fallbackMessage, details) {
  if (Array.isArray(value)) {
    value.forEach((entry) => flattenCollection(entry, parentCode, fallbackMessage, details));
    return;
  }
  details.push(normalizeEntry(value, parentCode, fallbackMessage));
}

function firstExplicitMessage(detail, payload) {
  if (isRecord(detail)) {
    const detailMessage = safeString(detail.message).trim();
    if (detailMessage) return detailMessage;
  }
  if (isRecord(payload)) {
    const payloadMessage = safeString(payload.message).trim();
    if (payloadMessage) return payloadMessage;
  }
  return "";
}

function firstCode(detail, payload) {
  if (isRecord(detail) && safeString(detail.code)) return safeString(detail.code);
  if (isRecord(payload) && safeString(payload.code)) return safeString(payload.code);
  return "";
}

export function normalizeApiError(payload, fallbackMessage = "请求失败") {
  const fallback = safeFallback(fallbackMessage);
  const payloadIsRecord = isRecord(payload);
  const root = payloadIsRecord ? payload : {};
  const hasDetail = payloadIsRecord && Object.prototype.hasOwnProperty.call(root, "detail");
  const detail = hasDetail ? root.detail : payload;
  const details = [];
  const parentCode = firstCode(detail, root);

  if (typeof detail === "string") {
    details.push(normalizeEntry(detail, undefined, fallback));
  } else if (isRecord(detail)) {
    if (hasCollection(detail)) {
      for (const key of COLLECTION_KEYS) {
        if (detail[key] !== undefined) flattenCollection(detail[key], parentCode, fallback, details);
      }
    } else {
      details.push(normalizeEntry(detail, undefined, fallback));
    }
  } else if (Array.isArray(detail)) {
    flattenCollection(detail, undefined, fallback, details);
  } else if (detail !== undefined && detail !== null) {
    details.push(normalizeEntry(detail, undefined, fallback));
  } else if (isRecord(root) && (root.errors !== undefined || root.issues !== undefined || root.diagnostics !== undefined)) {
    for (const key of COLLECTION_KEYS) {
      if (root[key] !== undefined) flattenCollection(root[key], parentCode, fallback, details);
    }
  }

  const explicitMessage = firstExplicitMessage(detail, root);
  const firstDetailMessage = details.find((entry) => typeof entry.message === "string" && entry.message.trim())?.message;
  const message = explicitMessage || firstDetailMessage || (parentCode ? `${fallback}（${parentCode}）` : fallback);

  return { message: safeString(message) || fallback, details };
}

export { CODE_COPY };
