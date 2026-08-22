import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import GeneratePage from "./GeneratePage";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    getState: vi.fn(),
    generateTimetable: vi.fn(),
    saveTimetable: vi.fn(),
  },
}));

describe("GeneratePage - 生成预览/确认流程", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows generation and save loading states until each request settles", async () => {
    let resolveGenerate;
    let resolveSave;
    const appState = {
      revision: 7,
      settings: { periods_per_day: 7, working_days: 6 },
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [{ id: "s1", name: "数学" }],
      teachers: [{
        id: "t1",
        name: "张老师",
        qualified_subject_ids: ["s1"],
        teaching_assignment_ids: ["req-1"],
        weekly_unavailable_slots: [],
        homeroom_class_id: null,
        main_subject_id: null,
      }],
      rooms: [{ id: "r1", name: "101教室" }],
      course_requirements: [{
        id: "req-1",
        class_id: "c1",
        subject_id: "s1",
        teacher_id: "t1",
        room_id: "r1",
        periods_per_week: 5,
      }],
      split_course_blocks: [],
      timetable_versions: [],
    };
    const candidate = {
      id: "ver-preview",
      name: "2026秋季课表",
      effective_from: "2026-09-01",
      class_schedules: { c1: [] },
      teacher_schedules: {},
      room_schedules: {},
    };
    api.getState.mockResolvedValueOnce(appState);
    api.generateTimetable.mockReturnValueOnce(new Promise((resolve) => {
      resolveGenerate = resolve;
    }));
    api.saveTimetable.mockReturnValueOnce(new Promise((resolve) => {
      resolveSave = resolve;
    }));

    render(
      <MemoryRouter initialEntries={["/generate"]}>
        <Routes>
          <Route path="/generate" element={<GeneratePage />} />
          <Route path="/timetables/:id" element={<div>课表详情</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByLabelText("课表名称")).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText("课表名称"), { target: { value: "2026秋季课表" } });
    fireEvent.change(screen.getByLabelText("生效日期"), { target: { value: "2026-09-01" } });
    fireEvent.click(screen.getByRole("button", { name: "生成预览" }));

    const generationButton = await screen.findByRole("button", { name: "生成中…" });
    expect(generationButton).toBeDisabled();
    fireEvent.click(generationButton);
    expect(api.generateTimetable).toHaveBeenCalledTimes(1);

    resolveGenerate(candidate);
    const saveButton = await screen.findByRole("button", { name: "确认保存" });
    fireEvent.click(saveButton);

    const savingButton = await screen.findByRole("button", { name: "保存中…" });
    expect(savingButton).toBeDisabled();
    fireEvent.click(savingButton);
    expect(api.saveTimetable).toHaveBeenCalledTimes(1);

    resolveSave({ ...appState, revision: 8, timetable_versions: [candidate] });
    await waitFor(() => expect(screen.getByText("课表详情")).toBeInTheDocument());
  });

  it("1. 有效基础数据场景：填写名称与生效日期 -> 点击生成预览 -> 显示候选课表预览 -> 确认保存后保存并导航", async () => {
    const mockAppState = {
      revision: 7,
      settings: {
        periods_per_day: 7,
        working_days: 6,
      },
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [{ id: "s1", name: "数学" }],
      teachers: [
        {
          id: "t1",
          name: "张老师",
          qualified_subject_ids: ["s1"],
          teaching_assignment_ids: ["req-1"],
          weekly_unavailable_slots: [],
          homeroom_class_id: null,
          main_subject_id: null,
        },
      ],
      rooms: [{ id: "r1", name: "101教室" }],
      course_requirements: [
        {
          id: "req-1",
          class_id: "c1",
          subject_id: "s1",
          teacher_id: "t1",
          room_id: "r1",
          periods_per_week: 5,
        },
      ],
      split_course_blocks: [],
      timetable_versions: [],
    };

    const mockCandidateVersion = {
      id: "ver-preview",
      name: "2026秋季课表",
      effective_from: "2026-09-01",
      parent_version_id: null,
      class_schedules: {
        c1: [
          [
            { kind: "lesson", requirement_id: "req-1" },
            null,
            null,
            null,
            null,
            null,
            null,
          ],
          [null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null],
          [null, null, null, null, null, null, null],
        ],
      },
      teacher_schedules: {},
      room_schedules: {},
    };

    api.getState.mockResolvedValue(mockAppState);
    api.generateTimetable.mockResolvedValue(mockCandidateVersion);
    api.saveTimetable.mockResolvedValue({
      ...mockAppState,
      revision: 8,
      timetable_versions: [mockCandidateVersion],
    });

    render(
      <MemoryRouter initialEntries={["/generate"]}>
        <Routes>
          <Route path="/generate" element={<GeneratePage />} />
          <Route
            path="/timetables/:id"
            element={<div data-testid="target-timetable-page">目标课表页面</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    // 等待基础数据加载完成
    await waitFor(() => {
      expect(api.getState).toHaveBeenCalled();
    });

    // 查找并填写课表名称和生效日期（通过 label/role）
    const nameInput = screen.getByLabelText(/课表名称/i);
    const dateInput = screen.getByLabelText(/生效日期/i);

    fireEvent.change(nameInput, { target: { value: "2026秋季课表" } });
    fireEvent.change(dateInput, { target: { value: "2026-09-01" } });

    // 点击“生成预览”按钮
    const generateBtn = screen.getByRole("button", { name: /生成预览/i });
    expect(generateBtn).not.toBeDisabled();
    fireEvent.click(generateBtn);

    // 验证调用了 generateTimetable 且参数正确
    await waitFor(() => {
      expect(api.generateTimetable).toHaveBeenCalledWith({
        name: "2026秋季课表",
        effective_from: "2026-09-01",
      });
    });

    // 预览区域应通过 ScheduleGrid 显示班级名、科目/教师/教室内容
    await waitFor(() => {
      expect(screen.getByText("高一(1)班")).toBeInTheDocument();
      expect(screen.getByText("数学")).toBeInTheDocument();
      expect(screen.getByText(/张老师/)).toBeInTheDocument();
      expect(screen.getByText("101教室")).toBeInTheDocument();
    });

    // 在点击“确认保存”前 api.saveTimetable 必须未调用
    expect(api.saveTimetable).not.toHaveBeenCalled();

    // 点击“确认保存”按钮
    const confirmBtn = screen.getByRole("button", { name: /确认保存/i });
    fireEvent.click(confirmBtn);

    // 验证调用了 saveTimetable({ base_revision: 7, version: mockCandidateVersion })
    await waitFor(() => {
      expect(api.saveTimetable).toHaveBeenCalledWith({
        base_revision: 7,
        version: mockCandidateVersion,
      });
    });

    // 验证保存成功后导航到 /timetables/ver-preview，可通过目标 Route marker 断言
    await waitFor(() => {
      expect(screen.getByTestId("target-timetable-page")).toBeInTheDocument();
    });
  });

  it("2. 非法基础数据场景：教师无资质或无课程要求 -> 显示提示、禁用生成预览、提供基础数据链接", async () => {
    const invalidAppState = {
      revision: 7,
      settings: {
        periods_per_day: 7,
        working_days: 6,
      },
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [{ id: "s1", name: "数学" }],
      teachers: [
        {
          id: "t1",
          name: "张老师",
          qualified_subject_ids: [], // 无资质
          teaching_assignment_ids: [],
          weekly_unavailable_slots: [],
          homeroom_class_id: null,
          main_subject_id: null,
        },
      ],
      rooms: [{ id: "r1", name: "101教室" }],
      course_requirements: [], // 无课程要求
      split_course_blocks: [],
      timetable_versions: [],
    };

    api.getState.mockResolvedValue(invalidAppState);

    render(
      <MemoryRouter initialEntries={["/generate"]}>
        <Routes>
          <Route path="/generate" element={<GeneratePage />} />
          <Route
            path="/catalog"
            element={<div data-testid="catalog-page">基础数据管理</div>}
          />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.getState).toHaveBeenCalled();
    });

    // 页面应显示可理解的校验提示
    await waitFor(() => {
      expect(
        screen.getByText(/基础数据不完整|未配置课程要求|教师缺少科目资质/i)
      ).toBeInTheDocument();
    });

    // “生成预览”按钮应被禁用
    const generateBtn = screen.getByRole("button", { name: /生成预览/i });
    expect(generateBtn).toBeDisabled();

    // 尝试点击（如果没被 disabled 阻止）也不应调用 api.generateTimetable
    fireEvent.click(generateBtn);
    expect(api.generateTimetable).not.toHaveBeenCalled();

    // 提供“前往基础数据”链接并可跳转到 /catalog
    const catalogLink = screen.getByRole("link", { name: /前往基础数据/i });
    expect(catalogLink).toBeInTheDocument();
    expect(catalogLink).toHaveAttribute("href", "/catalog");
  });

  it("3. 生成失败场景：API reject 后显示错误，不能出现确认保存或调用 save", async () => {
    const validAppState = {
      revision: 7,
      settings: {
        periods_per_day: 7,
        working_days: 6,
      },
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [{ id: "s1", name: "数学" }],
      teachers: [
        {
          id: "t1",
          name: "张老师",
          qualified_subject_ids: ["s1"],
          teaching_assignment_ids: ["req-1"],
          weekly_unavailable_slots: [],
          homeroom_class_id: null,
          main_subject_id: null,
        },
      ],
      rooms: [{ id: "r1", name: "101教室" }],
      course_requirements: [
        {
          id: "req-1",
          class_id: "c1",
          subject_id: "s1",
          teacher_id: "t1",
          room_id: "r1",
          periods_per_week: 5,
        },
      ],
      split_course_blocks: [],
      timetable_versions: [],
    };

    api.getState.mockResolvedValue(validAppState);
    api.generateTimetable.mockRejectedValueOnce(
      new Error("排课约束冲突，无法生成可行解")
    );

    render(
      <MemoryRouter initialEntries={["/generate"]}>
        <Routes>
          <Route path="/generate" element={<GeneratePage />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(api.getState).toHaveBeenCalled();
    });

    const nameInput = screen.getByLabelText(/课表名称/i);
    const dateInput = screen.getByLabelText(/生效日期/i);

    fireEvent.change(nameInput, { target: { value: "2026秋季课表" } });
    fireEvent.change(dateInput, { target: { value: "2026-09-01" } });

    const generateBtn = screen.getByRole("button", { name: /生成预览/i });
    fireEvent.click(generateBtn);

    // API 抛出错误后，页面应呈现错误信息 alert/text
    await waitFor(() => {
      expect(
        screen.getByText(/排课约束冲突，无法生成可行解|生成失败/i)
      ).toBeInTheDocument();
    });

    // 不能出现“确认保存”按钮
    expect(
      screen.queryByRole("button", { name: /确认保存/i })
    ).not.toBeInTheDocument();

    // 不能调用 saveTimetable
    expect(api.saveTimetable).not.toHaveBeenCalled();
  });
});
