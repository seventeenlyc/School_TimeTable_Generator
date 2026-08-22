import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./client";

describe("api client", () => {
  const mockAppState = { revision: 2, timetable_versions: [] };

  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockAppState,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("createChildVersion sends POST to same-origin /api/timetables/:id/versions and returns AppState unchanged", async () => {
    const payload = { branch_name: "draft-1", notes: "testing" };
    const result = await api.createChildVersion("ver 1", payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/timetables/ver%201/versions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(payload),
      })
    );
    expect(result).toEqual(mockAppState);
  });

  it("getCalendarDay sends GET request to same-origin /api/calendar/day?date=2026-09-08", async () => {
    const result = await api.getCalendarDay("2026-09-08");

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "/api/calendar/day?date=2026-09-08",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
    expect(result).toEqual(mockAppState);
  });

  it("normalizes structured validation errors without object stringification", async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({
        detail: {
          code: "schedule_validation_failed",
          errors: [{
            code: "teacher_double_booked",
            message: "Teacher has multiple assignments in one slot",
            entity_ids: ["version-1", "teacher-1"],
            weekday: 2,
            period: 1,
          }],
        },
      }),
    });

    await expect(api.updateCatalog({})).rejects.toMatchObject({
      status: 422,
      message: expect.stringContaining("教师同一时间被安排了多门课程"),
      details: [expect.objectContaining({ code: "teacher_double_booked" })],
    });
  });
});
