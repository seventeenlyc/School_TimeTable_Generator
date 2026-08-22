import { describe, expect, it } from "vitest";
import { normalizeApiError } from "./errors";

describe("normalizeApiError", () => {
  it("uses a string detail as both the message and diagnostic", () => {
    expect(normalizeApiError({ detail: "保存失败" })).toMatchObject({
      message: "保存失败",
      details: [{ message: "保存失败" }],
    });
  });

  it("normalizes a primitive payload without object stringification", () => {
    expect(normalizeApiError("服务不可用")).toMatchObject({
      message: "服务不可用",
      details: [{ message: "服务不可用" }],
    });
  });

  it("translates a known validation code and preserves location fields", () => {
    const validation = normalizeApiError({
      detail: {
        code: "schedule_validation_failed",
        errors: [{
          code: "teacher_double_booked",
          message: "Teacher has multiple assignments in one slot",
          entity_ids: ["version-1", "teacher-1", "class-1", "class-3"],
          weekday: 2,
          period: 1,
        }],
      },
    });

    expect(validation.message).toContain("教师同一时间被安排了多门课程");
    expect(validation.details[0]).toMatchObject({
      code: "teacher_double_booked",
      weekday: 2,
      period: 1,
      entity_ids: ["version-1", "teacher-1", "class-1", "class-3"],
    });
  });

  it("prefers an explicit detail message and supports top-level message payloads", () => {
    expect(normalizeApiError({ detail: { code: "revision_conflict", message: "版本已变化" } })).toMatchObject({
      message: "版本已变化",
      details: [{ code: "revision_conflict", message: "数据已被更新，请重新加载后再保存" }],
    });
    expect(normalizeApiError({ message: "服务不可用" })).toMatchObject({
      message: "服务不可用",
      details: [{ message: "服务不可用" }],
    });
  });

  it("flattens errors, issues, and diagnostics into detail objects", () => {
    const normalized = normalizeApiError({
      detail: {
        code: "schedule_validation_failed",
        errors: [{ code: "teacher_double_booked", message: "教师撞课", period: 1 }],
        issues: [{ code: "room_double_booked", message: "教室冲突", weekday: 3 }],
        diagnostics: ["no room capacity"],
      },
    });

    expect(normalized.details).toHaveLength(3);
    expect(normalized.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "teacher_double_booked", period: 1 }),
      expect.objectContaining({ code: "room_double_booked", weekday: 3 }),
      expect.objectContaining({ message: "no room capacity" }),
    ]));
  });

  it("uses a safe code fallback for unknown objects without stringifying objects", () => {
    expect(normalizeApiError({ detail: { code: "unknown", foo: "bar" } }).message)
      .toBe("请求失败（unknown）");
    expect(normalizeApiError({ detail: { diagnostics: ["no room capacity"] } }).details)
      .toHaveLength(1);
    expect(String(normalizeApiError({ detail: { foo: "bar" } }).message))
      .not.toContain("[object Object]");
  });
});
