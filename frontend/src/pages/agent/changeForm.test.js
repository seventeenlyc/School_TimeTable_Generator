import { describe, it, expect } from "vitest";
import { buildEvent } from "./changeForm";

describe("changeForm event serialization", () => {
  it("serializes absence event accurately", () => {
    const event = buildEvent({
      kind: "absence",
      teacherId: "teacher-1",
      startDate: "2026-09-01",
      endDate: "2026-09-30",
      reason: "病假",
    });

    expect(event).toEqual({
      kind: "absence",
      teacher_id: "teacher-1",
      start_date: "2026-09-01",
      end_date: "2026-09-30",
      reason: "病假",
      busy_slots: [],
    });
  });

  it("serializes busy event with slots", () => {
    const event = buildEvent({
      kind: "busy",
      teacherId: "teacher-1",
      startDate: "2026-09-08",
      endDate: "2026-09-08",
      reason: "参加教研",
      busySlots: [{ date: "2026-09-08", period: 2 }],
    });

    expect(event).toEqual({
      kind: "busy",
      teacher_id: "teacher-1",
      start_date: "2026-09-08",
      end_date: "2026-09-08",
      reason: "参加教研",
      busy_slots: [{ date: "2026-09-08", period: 2 }],
    });
  });

  it("throws error when end date is earlier than start date", () => {
    expect(() =>
      buildEvent({
        kind: "absence",
        teacherId: "teacher-1",
        startDate: "2026-09-10",
        endDate: "2026-09-05",
      })
    ).toThrow("结束日期不能早于开始日期");
  });
});
