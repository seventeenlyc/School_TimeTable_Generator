import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import TimetablePage from "./TimetablePage";
import { api } from "../../api/client";
import { downloadClassTimetables } from "../../domain/exportTimetable";

vi.mock("../../api/client", () => ({
  api: {
    getState: vi.fn(),
    getCalendarDay: vi.fn(),
    getDay: vi.fn(),
  },
}));

vi.mock("../../domain/exportTimetable", () => ({
  downloadClassTimetables: vi.fn(),
}));

describe("TimetablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows an entry point for exporting every class timetable", async () => {
    api.getState.mockResolvedValue({
      revision: 1,
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [],
      teachers: [],
      rooms: [],
      course_requirements: [],
      split_course_blocks: [],
      timetable_versions: [
        {
          id: "ver-1",
          name: "高一课表",
          effective_from: "2026-09-01",
          class_schedules: { c1: [] },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/timetables/ver-1"]}>
        <Routes>
          <Route path="/timetables/:id" element={<TimetablePage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("button", { name: "导出全部班级课表" })
    ).toBeInTheDocument();
  });

  it("downloads all class timetables and prevents duplicate clicks while exporting", async () => {
    let finishExport;
    downloadClassTimetables.mockReturnValue(
      new Promise((resolve) => {
        finishExport = resolve;
      })
    );
    const appState = {
      revision: 1,
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [],
      teachers: [],
      rooms: [],
      course_requirements: [],
      split_course_blocks: [],
      timetable_versions: [
        {
          id: "ver-1",
          name: "高一课表",
          effective_from: "2026-09-01",
          class_schedules: { c1: [] },
        },
      ],
    };
    api.getState.mockResolvedValue(appState);

    render(
      <MemoryRouter initialEntries={["/timetables/ver-1"]}>
        <Routes>
          <Route path="/timetables/:id" element={<TimetablePage />} />
        </Routes>
      </MemoryRouter>
    );

    const exportButton = await screen.findByRole("button", {
      name: "导出全部班级课表",
    });
    fireEvent.click(exportButton);

    await waitFor(() => {
      expect(downloadClassTimetables).toHaveBeenCalledWith(
        appState,
        appState.timetable_versions[0]
      );
    });
    expect(exportButton).toBeDisabled();
    expect(exportButton).toHaveAttribute("aria-busy", "true");
    expect(exportButton).toHaveTextContent("导出中…");

    finishExport();
    await waitFor(() => expect(exportButton).not.toBeDisabled());
  });

  it("renders calendar day view when switching to date tab and changing date to 2026-09-08", async () => {
    api.getState.mockResolvedValue({
      revision: 1,
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [{ id: "s1", name: "数学" }],
      teachers: [
        { id: "t1", name: "李老师" },
        { id: "t2", name: "张老师" },
      ],
      rooms: [{ id: "r1", name: "301教室" }],
      course_requirements: [
        {
          id: "req1",
          class_id: "c1",
          subject_id: "s1",
          teacher_id: "t1",
          room_id: "r1",
        },
      ],
      timetable_versions: [
        {
          id: "ver-1",
          name: "高一课表",
          effective_from: "2026-09-01",
          class_schedules: {
            c1: [
              { kind: "lesson", requirement_id: "req1" },
              null,
              null,
            ],
          },
        },
      ],
    });

    api.getCalendarDay.mockResolvedValue({
      date: "2026-09-08",
      version_id: "ver-1",
      class_schedules: {
        c1: [
          null,
          null,
          {
            cell: { kind: "lesson", requirement_id: "req1" },
            class_ids: ["c1"],
            subject_ids: ["s1"],
            teacher_ids: ["t2"],
            room_ids: ["r1"],
            target_ids: ["req1"],
          },
        ],
      },
    });

    render(
      <MemoryRouter initialEntries={["/timetables/ver-1"]}>
        <Routes>
          <Route path="/timetables/:id" element={<TimetablePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /按真实日期查看/i })).toBeInTheDocument();
    });

    const dateTabBtn = screen.getByRole("button", { name: /按真实日期查看/i });
    fireEvent.click(dateTabBtn);

    const dateInput = document.querySelector('input[type="date"]');
    expect(dateInput).toBeInTheDocument();
    fireEvent.change(dateInput, { target: { value: "2026-09-08" } });

    await waitFor(() => {
      expect(api.getCalendarDay).toHaveBeenCalledWith("2026-09-08");
    });

    await waitFor(() => {
      expect(screen.getByText(/2026-09-08/)).toBeInTheDocument();
      expect(screen.getByText(/周二/)).toBeInTheDocument();
      expect(screen.getByText(/高一\(1\)班/)).toBeInTheDocument();
      expect(screen.getByText(/第 3 节/)).toBeInTheDocument();
      expect(screen.getByText(/数学/)).toBeInTheDocument();
      expect(screen.getByText(/张老师/)).toBeInTheDocument();
      expect(screen.getByText(/301教室/)).toBeInTheDocument();
      expect(screen.getByTestId("substitute-badge")).toBeInTheDocument();
      expect(screen.getByTestId("substitute-badge")).toHaveTextContent("代课");
    });
  });

  it("renders teacher weekly timetable with normal and split lessons", async () => {
    const emptyGrid = () => Array.from({ length: 6 }, () => Array(3).fill(null));

    const teacherGrid = emptyGrid();
    teacherGrid[0][0] = {
      target_kind: "requirement",
      target_id: "req-math",
      class_ids: ["c1"],
      subject_id: "s-math",
      teacher_id: "t1",
      room_id: "r101",
    };
    teacherGrid[1][1] = {
      target_kind: "split_group",
      target_id: "group-geo",
      class_ids: ["c1", "c2"],
      subject_id: "s-geo",
      teacher_id: "t1",
      room_id: "r301",
    };

    api.getState.mockResolvedValue({
      revision: 1,
      classes: [
        { id: "c1", name: "高一(1)班" },
        { id: "c2", name: "高一(2)班" },
      ],
      subjects: [
        { id: "s-math", name: "数学" },
        { id: "s-geo", name: "地理" },
      ],
      teachers: [{ id: "t1", name: "张老师" }],
      rooms: [
        { id: "r101", name: "101教室" },
        { id: "r301", name: "301教室" },
      ],
      course_requirements: [
        {
          id: "req-math",
          class_id: "c1",
          subject_id: "s-math",
          teacher_id: "t1",
          room_id: "r101",
        },
      ],
      split_course_blocks: [
        {
          id: "split-geo",
          source_class_ids: ["c1", "c2"],
          groups: [
            {
              id: "group-geo",
              subject_id: "s-geo",
              teacher_id: "t1",
              room_id: "r301",
              class_ids: ["c1", "c2"],
            },
          ],
        },
      ],
      timetable_versions: [
        {
          id: "ver-1",
          name: "高一课表",
          effective_from: "2026-09-01",
          class_schedules: {
            c1: emptyGrid(),
            c2: emptyGrid(),
          },
          teacher_schedules: {
            t1: teacherGrid,
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/timetables/ver-1"]}>
        <Routes>
          <Route path="/timetables/:id" element={<TimetablePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /按教师查看/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /按教师查看/i }));

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    const teacherSelect = screen.getByRole("combobox");
    expect(teacherSelect).toHaveValue("t1");

    // 不再出现“教师周课表视图”占位文案
    expect(screen.queryByText("教师周课表视图")).not.toBeInTheDocument();

    // 显示周一到周六和第1/第2节
    expect(screen.getByRole("columnheader", { name: "周一" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "周二" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "周三" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "周四" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "周五" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "周六" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /第 1 节/i })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: /第 2 节/i })).toBeInTheDocument();

    // 普通课显示数学、高一(1)班、101教室
    expect(screen.getByText("数学")).toBeInTheDocument();
    expect(screen.getByText("高一(1)班")).toBeInTheDocument();
    expect(screen.getByText("101教室")).toBeInTheDocument();

    // 走班课显示地理、高一(1)班 + 高一(2)班、301教室、走班标识
    expect(screen.getByText("地理")).toBeInTheDocument();
    expect(screen.getByText(/高一\(1\)班.*高一\(2\)班|高一\(1\)班.*,.*高一\(2\)班/)).toBeInTheDocument();
    expect(screen.getByText("301教室")).toBeInTheDocument();
    expect(screen.getByText("走班")).toBeInTheDocument();
  });

  it("renders null class cells as 自习 and not 空课 in class schedule view", async () => {
    const emptyGrid = () => Array.from({ length: 6 }, () => Array(2).fill(null));
    const classGrid = emptyGrid();
    classGrid[0][0] = {
      kind: "lesson",
      requirement_id: "req-math",
    };

    api.getState.mockResolvedValue({
      revision: 1,
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [{ id: "s-math", name: "数学" }],
      teachers: [{ id: "t1", name: "张老师" }],
      rooms: [{ id: "r101", name: "101教室" }],
      course_requirements: [
        {
          id: "req-math",
          class_id: "c1",
          subject_id: "s-math",
          teacher_id: "t1",
          room_id: "r101",
        },
      ],
      timetable_versions: [
        {
          id: "ver-1",
          name: "高一课表",
          effective_from: "2026-09-01",
          class_schedules: {
            c1: classGrid,
          },
          teacher_schedules: {
            t1: classGrid,
          },
        },
      ],
    });

    render(
      <MemoryRouter initialEntries={["/timetables/ver-1"]}>
        <Routes>
          <Route path="/timetables/:id" element={<TimetablePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("数学")).toBeInTheDocument();
    });

    // In class view, empty cells should display "自习" and should NOT display "空课"
    expect(screen.getAllByText("自习").length).toBeGreaterThan(0);
    expect(screen.queryByText("空课")).not.toBeInTheDocument();
  });
});
