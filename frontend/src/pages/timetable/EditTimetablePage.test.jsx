import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import EditTimetablePage from "./EditTimetablePage";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    getState: vi.fn(),
    createChildVersion: vi.fn(),
  },
}));

describe("EditTimetablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getState.mockResolvedValue({
      revision: 1,
      classes: [{ id: "c1", name: "高一(1)班" }],
      teachers: [{ id: "t1", name: "张老师" }],
      rooms: [],
      subjects: [{ id: "s1", name: "数学" }],
      course_requirements: [{ id: "req1", class_id: "c1", subject_id: "s1", teacher_id: "t1" }],
      timetable_versions: [
        {
          id: "ver-1",
          name: "秋季基准课表",
          effective_from: "2026-09-01",
          class_schedules: {
            c1: [[{ kind: "lesson", requirement_id: "req1" }]],
          },
        },
      ],
    });
  });

  it("loads timetable version and saves as child version without overwriting base", async () => {
    api.createChildVersion.mockResolvedValueOnce({ id: "ver-2" });

    render(
      <MemoryRouter initialEntries={["/timetables/ver-1/edit"]}>
        <Routes>
          <Route path="/timetables/:id/edit" element={<EditTimetablePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/秋季基准课表 \(修订版\)/i)).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole("button", { name: /保存为新版本/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.createChildVersion).toHaveBeenCalledWith(
        "ver-1",
        expect.objectContaining({
          base_revision: 1,
          name: "秋季基准课表 (修订版)",
        })
      );
    });
  });
});
