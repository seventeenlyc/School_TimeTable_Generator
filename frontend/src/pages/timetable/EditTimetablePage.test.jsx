import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import EditTimetablePage from "./EditTimetablePage";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    getState: vi.fn(),
    createChildVersion: vi.fn(),
  },
}));

function TimetableDetailView() {
  const { id } = useParams();
  return <div data-testid="timetable-detail">Timetable ID: {id}</div>;
}

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

  it("keeps the child-version action disabled while creation is pending", async () => {
    let resolveCreate;
    api.createChildVersion.mockReturnValueOnce(new Promise((resolve) => {
      resolveCreate = resolve;
    }));

    render(
      <MemoryRouter initialEntries={["/timetables/ver-1/edit"]}>
        <Routes>
          <Route path="/timetables/:id/edit" element={<EditTimetablePage />} />
          <Route path="/timetables/:id" element={<TimetableDetailView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByDisplayValue("秋季基准课表 (修订版)")).toBeInTheDocument());
    const saveButton = screen.getByRole("button", { name: "保存为新版本" });
    fireEvent.click(saveButton);

    const pendingButton = await screen.findByRole("button", { name: "正在创建…" });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(api.createChildVersion).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveCreate({
        timetable_versions: [{
          id: "ver-2",
          name: "秋季基准课表 (修订版)",
          effective_from: new Date().toISOString().split("T")[0],
          parent_version_id: "ver-1",
          class_schedules: { c1: [[{ kind: "lesson", requirement_id: "req1" }]] },
        }],
      });
      await Promise.resolve();
    });
  });

  it("loads timetable version and saves as child version without overwriting base", async () => {
    const today = new Date().toISOString().split("T")[0];
    api.createChildVersion.mockResolvedValueOnce({
      revision: 2,
      timetable_versions: [
        {
          id: "ver-1",
          name: "秋季基准课表",
          effective_from: "2026-09-01",
          class_schedules: {
            c1: [[{ kind: "lesson", requirement_id: "req1" }]],
          },
        },
        {
          id: "ver-2",
          name: "秋季基准课表 (修订版)",
          effective_from: today,
          parent_version_id: "ver-1",
          class_schedules: {
            c1: [[{ kind: "lesson", requirement_id: "req1" }]],
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/timetables/ver-1/edit"]}>
        <Routes>
          <Route path="/timetables/:id/edit" element={<EditTimetablePage />} />
          <Route path="/timetables/:id" element={<TimetableDetailView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("秋季基准课表 (修订版)")).toBeInTheDocument();
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

    await waitFor(() => {
      expect(screen.getByTestId("timetable-detail")).toHaveTextContent("Timetable ID: ver-2");
    });
  });
});
