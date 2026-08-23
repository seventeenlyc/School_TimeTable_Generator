import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import CatalogPage from "./CatalogPage";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    getState: vi.fn(),
    updateCatalog: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

let importFixture = null;

vi.mock("./CatalogImportDialog", () => ({
  default: ({ form, open, onApply, onClose, applyDisabled }) => {
    if (!open) return null;

    const fixture = importFixture?.(form) || (() => {
      const importedTeacher = {
        id: "imported-teacher",
        name: "导入老师",
        qualified_subject_ids: ["s2"],
        teaching_assignment_ids: [],
        weekly_unavailable_slots: [],
        homeroom_class_id: null,
        main_subject_id: "s2",
      };
      const importedRequirement = {
        id: "imported-req",
        class_id: "c2",
        subject_id: "s2",
        teacher_id: "imported-teacher",
        periods_per_week: 3,
        room_id: "r2",
        consecutive_periods: 1,
        fixed_slots: [],
      };
      return {
        importedTeacher,
        importedRequirement,
        nextForm: {
          ...form,
          teachers: [importedTeacher, ...form.teachers],
          course_requirements: [importedRequirement, ...form.course_requirements],
        },
        created: {
          teachers: [importedTeacher.id],
          courseRequirements: [importedRequirement.id],
          classes: [],
          subjects: [],
          rooms: [],
        },
      };
    })();

    return (
      <div role="dialog" aria-label="Excel 基础数据导入">
        <button
          type="button"
          onClick={() =>
            onApply?.({
              nextForm: fixture.nextForm,
              created: fixture.created,
            })
          }
          disabled={applyDisabled}
        >
          应用模拟导入
        </button>
        <button type="button" onClick={onClose}>
          取消导入
        </button>
      </div>
    );
  },
}));

describe("CatalogPage", () => {
  const createMockState = () => ({
    revision: 1,
    settings: {
      working_days: 5,
      periods_per_day: 8,
      long_absence_days: 28,
      max_daily_subject_periods: 2,
      backup_limit: 20,
    },
    classes: [
      { id: "c1", name: "高一(1)班" },
      { id: "c2", name: "高一(2)班" },
    ],
    teachers: [
      {
        id: "t1",
        name: "张老师",
        qualified_subject_ids: ["s1"],
        teaching_assignment_ids: ["req1"],
        weekly_unavailable_slots: [],
        homeroom_class_id: "c1",
        main_subject_id: "s1",
      },
      {
        id: "t2",
        name: "王老师",
        qualified_subject_ids: ["s2"],
        teaching_assignment_ids: [],
        weekly_unavailable_slots: [],
        homeroom_class_id: "c2",
        main_subject_id: "s2",
      },
    ],
    subjects: [
      { id: "s1", name: "地理" },
      { id: "s2", name: "政治" },
    ],
    rooms: [
      { id: "r1", name: "301" },
      { id: "r2", name: "302" },
    ],
    course_requirements: [
      {
        id: "req1",
        class_id: "c1",
        subject_id: "s1",
        teacher_id: "t1",
        periods_per_week: 4,
        room_id: "r1",
        consecutive_periods: 1,
      },
    ],
    split_course_blocks: [],
  });

  beforeEach(() => {
    vi.clearAllMocks();
    importFixture = null;
    api.getState.mockResolvedValue(createMockState());
    api.updateCatalog.mockImplementation(async (payload) => ({
      ...createMockState(),
      revision: (payload.base_revision || 1) + 1,
      ...payload,
    }));
    api.updateSettings.mockImplementation(async (payload) => ({
      ...createMockState(),
      revision: (payload.base_revision || 1) + 1,
      settings: payload.settings,
    }));
  });

  it("renders catalog tabs and initial data", async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("高一(1)班")).toBeInTheDocument();
      expect(screen.getByText(/基础排课数据管理/i)).toBeInTheDocument();
    });
  });

  it("saves updated catalog sending payload to api", async () => {
    api.updateCatalog.mockResolvedValueOnce({
      revision: 2,
      classes: [{ id: "c1", name: "高一(1)班" }, { id: "c2", name: "高一(2)班" }],
      teachers: [{ id: "t1", name: "张老师" }],
      rooms: [],
      subjects: [],
      course_requirements: [],
      split_course_blocks: [],
    });

    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByDisplayValue("高一(1)班")).toBeInTheDocument();
    });

    const saveBtn = screen.getByRole("button", { name: /保存基础数据/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          base_revision: 1,
          classes: expect.arrayContaining([expect.objectContaining({ name: "高一(1)班" })]),
        })
      );
    });
  });

  it("shows the catalog save loading state and prevents a second submission while pending", async () => {
    let resolveSave;
    api.updateCatalog.mockReturnValueOnce(new Promise((resolve) => {
      resolveSave = resolve;
    }));

    render(<CatalogPage />);
    await waitFor(() => expect(screen.getByDisplayValue("高一(1)班")).toBeInTheDocument());

    const saveButton = screen.getByRole("button", { name: "保存基础数据" });
    fireEvent.click(saveButton);

    const pendingButton = await screen.findByRole("button", { name: "保存中…" });
    expect(pendingButton).toBeDisabled();
    expect(api.updateCatalog).toHaveBeenCalledTimes(1);

    fireEvent.click(pendingButton);
    expect(api.updateCatalog).toHaveBeenCalledTimes(1);

    resolveSave(createMockState());
    await waitFor(() => expect(screen.getByRole("button", { name: "保存基础数据" })).toBeInTheDocument());
  });

  it("blocks opening or applying an import while catalog save is pending", async () => {
    let resolveSave;
    api.updateCatalog.mockReturnValueOnce(new Promise((resolve) => {
      resolveSave = resolve;
    }));

    render(<CatalogPage />);
    await waitFor(() => expect(screen.getByDisplayValue("高一(1)班")).toBeInTheDocument());

    const importButton = screen.getByRole("button", { name: /导入 Excel/i });
    fireEvent.click(importButton);
    expect(screen.getByRole("dialog", { name: "Excel 基础数据导入" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "保存基础数据" }));
    await screen.findByRole("button", { name: "保存中…" });

    expect(importButton).toBeDisabled();
    const applyButton = screen.getByRole("button", { name: "应用模拟导入" });
    expect(applyButton).toBeDisabled();
    fireEvent.click(applyButton);
    expect(screen.queryByRole("group", { name: /导入老师/ })).not.toBeInTheDocument();

    resolveSave(createMockState());
    await waitFor(() => expect(screen.getByRole("button", { name: "保存基础数据" })).toBeInTheDocument());
  });

  it("switches from another tab to the first newly imported entity in form order", async () => {
    const firstCreated = {
      id: "imported-teacher-1",
      name: "导入老师一",
      qualified_subject_ids: ["s2"],
      teaching_assignment_ids: [],
      weekly_unavailable_slots: [],
      homeroom_class_id: null,
      main_subject_id: "s2",
    };
    const secondCreated = {
      id: "imported-teacher-2",
      name: "导入老师二",
      qualified_subject_ids: ["s2"],
      teaching_assignment_ids: [],
      weekly_unavailable_slots: [],
      homeroom_class_id: null,
      main_subject_id: "s2",
    };
    importFixture = (currentForm) => ({
      nextForm: {
        ...currentForm,
        teachers: [secondCreated, firstCreated, ...currentForm.teachers],
      },
      created: {
        teachers: [firstCreated.id, secondCreated.id],
        courseRequirements: [],
        classes: [],
        subjects: [],
        rooms: [],
      },
    });

    render(<CatalogPage />);
    await waitFor(() => expect(screen.getByDisplayValue("高一(1)班")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /科目/i }));
    fireEvent.click(screen.getByRole("button", { name: /导入 Excel/i }));
    fireEvent.click(screen.getByRole("button", { name: "应用模拟导入" }));

    const teachersTab = screen.getByRole("button", { name: /^教师 \(/i });
    await waitFor(() => expect(teachersTab).toHaveClass("bg-slate-800"));
    const teacherCards = screen.getAllByRole("group", { name: /教师/ });
    expect(teacherCards[0]).toHaveAccessibleName("教师 导入老师二");
  });

  it("allows editing teacher qualified subjects, homeroom class, main subject and weekly unavailable slots without manual teaching assignments", async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /教师/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /教师/i }));

    const teacherCard = screen.getByRole("group", { name: /教师\s*张老师/i });

    // 1. Edit qualified subjects, homeroom class, main subject
    const homeroomSelect = within(teacherCard).getByRole("combobox", { name: /班主任|所属班级|担任班主任/i });
    fireEvent.change(homeroomSelect, { target: { value: "c2" } });

    const mainSubjectSelect = within(teacherCard).getByRole("combobox", { name: /主要科目|主教学科/i });
    fireEvent.change(mainSubjectSelect, { target: { value: "s2" } });

    // Qualified subject multi-select or checkbox
    const politicalCheckbox = within(teacherCard).getByRole("checkbox", { name: /政治/i });
    fireEvent.click(politicalCheckbox);

    // 2. Select Monday (0) Period 2 (index 1) and add unavailable slot
    const daySelect = within(teacherCard).getByRole("combobox", { name: /星期|不排课星期|禁排星期/i });
    fireEvent.change(daySelect, { target: { value: "0" } });

    const periodSelect = within(teacherCard).getByRole("combobox", { name: /节次|不排课节次|禁排节次/i });
    fireEvent.change(periodSelect, { target: { value: "1" } });

    const addSlotBtn = within(teacherCard).getByRole("button", { name: /添加不排课|添加禁排/i });
    fireEvent.click(addSlotBtn);

    // 3. Save catalog and verify payload
    const saveBtn = screen.getByRole("button", { name: /保存基础数据/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateCatalog).toHaveBeenCalled();
    });

    const lastCall = api.updateCatalog.mock.calls[0][0];
    const updatedTeacher = lastCall.teachers.find((t) => t.id === "t1" || t.name === "张老师");

    expect(updatedTeacher).toBeDefined();
    expect(updatedTeacher.weekly_unavailable_slots).toEqual([{ weekday: 0, period: 1 }]);
    expect(updatedTeacher).not.toHaveProperty("unavailable_slots");
    expect(updatedTeacher.homeroom_class_id).toBe("c2");
    expect(updatedTeacher.main_subject_id).toBe("s2");
    expect(updatedTeacher.qualified_subject_ids).toEqual(expect.arrayContaining(["s1", "s2"]));
    // teaching_assignment_ids should be derived from course requirements (req1 is on t1)
    expect(updatedTeacher.teaching_assignment_ids).toEqual(["req1"]);
  });

  it("supports creating and configuring course requirements without a visible consecutive-period editor", async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /课程要求/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /课程要求/i }));

    const addReqBtn = screen.getByRole("button", { name: /添加课程要求/i });
    fireEvent.click(addReqBtn);

    const firstRequirementCard = screen.getAllByRole("group", { name: /课程要求/i })[0];
    fireEvent.change(within(firstRequirementCard).getByRole("combobox", { name: /班级/i }), { target: { value: "c2" } });
    fireEvent.change(within(firstRequirementCard).getByRole("combobox", { name: /科目/i }), { target: { value: "s2" } });
    fireEvent.change(within(firstRequirementCard).getByRole("combobox", { name: /教师/i }), { target: { value: "t2" } });
    fireEvent.change(within(firstRequirementCard).getByRole("combobox", { name: /教室|场地/i }), { target: { value: "r2" } });
    fireEvent.change(within(firstRequirementCard).getByRole("spinbutton", { name: /周课时/i }), { target: { value: "5" } });
    expect(within(firstRequirementCard).queryByRole("spinbutton", { name: /连堂|连续节次/i }))
      .not.toBeInTheDocument();

    const saveBtn = screen.getByRole("button", { name: /保存基础数据/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          course_requirements: expect.arrayContaining([
            expect.objectContaining({
              class_id: "c2",
              subject_id: "s2",
              teacher_id: "t2",
              room_id: "r2",
              periods_per_week: 5,
              consecutive_periods: 1,
            }),
          ]),
        })
      );
    });
  });

  it("applies an imported draft, keeps created entities first, and saves it", async () => {
    render(<CatalogPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: /导入 Excel/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /导入 Excel/i }));
    expect(screen.getByRole("dialog", { name: "Excel 基础数据导入" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "应用模拟导入" }));

    fireEvent.click(screen.getByRole("button", { name: /^教师 \(/i }));
    await waitFor(() => {
      const teacherCards = screen.getAllByRole("group", { name: /教师/ });
      expect(teacherCards[0]).toHaveAccessibleName("教师 导入老师");
    });

    fireEvent.click(screen.getByRole("button", { name: /课程要求/i }));
    await waitFor(() => {
      const requirementCards = screen.getAllByRole("group", { name: /课程要求/ });
      expect(requirementCards[0]).toHaveAccessibleName("课程要求 1");
      expect(within(requirementCards[0]).getByRole("combobox", { name: "教师" })).toHaveValue("imported-teacher");
    });

    fireEvent.click(screen.getByRole("button", { name: /保存基础数据/i }));
    await waitFor(() => {
      expect(api.updateCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          teachers: expect.arrayContaining([
            expect.objectContaining({ id: "imported-teacher", name: "导入老师" }),
          ]),
          course_requirements: expect.arrayContaining([
            expect.objectContaining({ id: "imported-req", teacher_id: "imported-teacher", consecutive_periods: 1 }),
          ]),
        })
      );
    });
  });

  it("does not change the catalog draft when the import dialog is canceled", async () => {
    render(<CatalogPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: /导入 Excel/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /导入 Excel/i }));
    fireEvent.click(screen.getByRole("button", { name: "取消导入" }));

    expect(screen.queryByRole("dialog", { name: "Excel 基础数据导入" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /教师/i }));
    expect(screen.getAllByRole("group", { name: /教师/ })[0]).toHaveAccessibleName("教师 张老师");

    fireEvent.click(screen.getByRole("button", { name: /保存基础数据/i }));
    await waitFor(() => expect(api.updateCatalog).toHaveBeenCalled());
    const savedPayload = api.updateCatalog.mock.calls[0][0];
    expect(savedPayload.teachers).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "imported-teacher" }),
    ]));
    expect(savedPayload.course_requirements).not.toEqual(expect.arrayContaining([
      expect.objectContaining({ id: "imported-req" }),
    ]));
  });

  it("inserts a newly created teacher at the beginning and focuses its name", async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(<CatalogPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: /教师/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /教师/i }));
    fireEvent.click(screen.getByRole("button", { name: /添加教师/i }));

    await waitFor(() => {
      const teacherCards = screen.getAllByRole("group", { name: /教师/ });
      expect(teacherCards[0]).toHaveAccessibleName("教师 教师 3");
      expect(within(teacherCards[0]).getByRole("textbox", { name: "教师姓名" })).toHaveFocus();
    });
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("inserts a newly created requirement at the beginning", async () => {
    render(<CatalogPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: /课程要求/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /课程要求/i }));
    fireEvent.click(screen.getByRole("button", { name: /添加课程要求/i }));

    const requirementCards = screen.getAllByRole("group", { name: /课程要求/ });
    expect(requirementCards[0]).toHaveAccessibleName("课程要求 1");
    await waitFor(() => expect(within(requirementCards[0]).getByRole("combobox", { name: "班级" })).toHaveFocus());
  });

  it("locates structured save errors in the active requirements tab", async () => {
    const error = new Error("保存失败");
    error.details = [{
      code: "duplicate_course_requirement",
      entity_ids: ["c1", "s1", "req1", "req2", "t1"],
      message: "课程要求重复录入",
    }];
    api.updateCatalog.mockRejectedValueOnce(error);
    render(<CatalogPage />);

    await waitFor(() => expect(screen.getByDisplayValue("高一(1)班")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /保存基础数据/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /查看错误位置/ })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /查看错误位置/ }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /课程要求 \(1\)/ })).toHaveClass("bg-slate-800");
      expect(screen.getByRole("group", { name: /课程要求 1/ })).toHaveAttribute("data-error-highlight", "true");
    });
  });

  it("cancels a stale locator animation frame before locating the next target", async () => {
    const stateWithTwoRequirements = createMockState();
    stateWithTwoRequirements.course_requirements.push({
      id: "req2",
      class_id: "c2",
      subject_id: "s2",
      teacher_id: "t2",
      periods_per_week: 2,
      room_id: "r2",
      consecutive_periods: 1,
    });
    api.getState.mockResolvedValueOnce(stateWithTwoRequirements);
    const error = new Error("保存失败");
    error.details = [{
      code: "duplicate_course_requirement",
      entity_ids: ["c1", "s1", "req1", "req2", "t1"],
      message: "课程要求重复录入",
    }];
    api.updateCatalog.mockRejectedValueOnce(error);

    const pendingFrames = new Map();
    let frameId = 0;
    const requestAnimationFrame = vi.fn((callback) => {
      const id = ++frameId;
      pendingFrames.set(id, callback);
      return id;
    });
    const cancelAnimationFrame = vi.fn((id) => pendingFrames.delete(id));
    const previousRequestAnimationFrame = window.requestAnimationFrame;
    const previousCancelAnimationFrame = window.cancelAnimationFrame;
    const previousScrollIntoView = HTMLElement.prototype.scrollIntoView;
    const scrollIntoView = vi.fn();
    window.requestAnimationFrame = requestAnimationFrame;
    window.cancelAnimationFrame = cancelAnimationFrame;
    HTMLElement.prototype.scrollIntoView = scrollIntoView;

    render(<CatalogPage />);
    await waitFor(() => expect(screen.getByDisplayValue("高一(1)班")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /保存基础数据/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /查看错误位置/ })).toBeInTheDocument());

    vi.useFakeTimers();
    window.requestAnimationFrame = requestAnimationFrame;
    window.cancelAnimationFrame = cancelAnimationFrame;
    try {
      fireEvent.click(screen.getByRole("button", { name: /查看错误位置/ }));
      fireEvent.click(screen.getByRole("button", { name: /查看下一处/ }));
      act(() => {
        for (const callback of pendingFrames.values()) callback(0);
      });

      expect(cancelAnimationFrame).toHaveBeenCalled();
      expect(scrollIntoView).toHaveBeenCalledTimes(1);
    } finally {
      act(() => {
        vi.runOnlyPendingTimers();
      });
      vi.useRealTimers();
      window.requestAnimationFrame = previousRequestAnimationFrame;
      window.cancelAnimationFrame = previousCancelAnimationFrame;
      HTMLElement.prototype.scrollIntoView = previousScrollIntoView;
    }
  });

  it("renders SplitCourseBlockEditor with non-empty default name, source classes and group controls upon adding a split block", async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /走班课程/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /走班课程/i }));

    const addBlockBtn = screen.getByRole("button", { name: /添加走班块/i });
    fireEvent.click(addBlockBtn);

    // Should render editor controls instead of just a read-only count summary
    const blockNameInput = screen.getByRole("textbox", { name: /走班块名称|名称/i });
    expect(blockNameInput).toBeInTheDocument();
    expect(blockNameInput.value).toBeTruthy();

    expect(screen.getByRole("group", { name: /来源班级|参与班级/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /添加分组|添加分流组/i })).toBeInTheDocument();
  });

  it("uses a generated stable ID instead of an array index for an id-less split block", async () => {
    const stateWithoutSplitId = createMockState();
    stateWithoutSplitId.split_course_blocks = [{
      name: "已有走班",
      source_class_ids: ["c1", "c2"],
      periods_per_week: 1,
      groups: [],
    }];
    api.getState.mockResolvedValueOnce(stateWithoutSplitId);
    render(<CatalogPage />);

    await waitFor(() => expect(screen.getByRole("button", { name: /走班课程/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /走班课程/i }));
    const blockNameInput = screen.getByRole("textbox", { name: /走班块名称|名称/i });
    const blockCard = blockNameInput.closest("[data-entity-id]");
    expect(blockCard).toHaveAttribute("data-entity-id");
    expect(blockCard.getAttribute("data-entity-id")).not.toBe("split-0");
  });

  it("allows editing system settings and updates revision via api.updateSettings", async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /系统设置|排课设置/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /系统设置|排课设置/i }));

    // working_days fixed to 5
    const workingDaysDisplay = screen.getByText(/5\s*天|周一至周五/i);
    expect(workingDaysDisplay).toBeInTheDocument();

    const periodsInput = screen.getByRole("spinbutton", { name: /每日节数|每日课时/i });
    fireEvent.change(periodsInput, { target: { value: "7" } });

    const saveSettingsBtn = screen.getByRole("button", { name: /保存系统设置/i });
    fireEvent.click(saveSettingsBtn);

    await waitFor(() => {
      expect(api.updateSettings).toHaveBeenCalledWith({
        base_revision: 1,
        settings: expect.objectContaining({
          working_days: 5,
          periods_per_day: 7,
        }),
      });
    });
  });

  it("shows the settings save loading state while the request is pending", async () => {
    let resolveSave;
    api.updateSettings.mockReturnValueOnce(new Promise((resolve) => {
      resolveSave = resolve;
    }));

    render(<CatalogPage />);
    await waitFor(() => expect(screen.getByRole("button", { name: /系统设置|排课设置/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /系统设置|排课设置/i }));

    const saveButton = screen.getByRole("button", { name: "保存系统设置" });
    fireEvent.click(saveButton);

    const pendingButton = await screen.findByRole("button", { name: "保存设置中…" });
    expect(pendingButton).toBeDisabled();
    expect(api.updateSettings).toHaveBeenCalledTimes(1);

    resolveSave(createMockState());
    await waitFor(() => expect(screen.getByRole("button", { name: "保存系统设置" })).toBeInTheDocument());
  });

  it("can add a fixed slot, choose Monday and period 8, submit it in API payload, and remove a fixed slot", async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /课程要求/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /课程要求/i }));

    // Click "添加固定时间"
    const addFixedSlotBtn = screen.getByRole("button", { name: /添加固定时间/i });
    fireEvent.click(addFixedSlotBtn);

    // Choose Monday (weekday 0) and period 8
    const weekdaySelect = screen.getByRole("combobox", { name: /固定星期|固定日期/i });
    fireEvent.change(weekdaySelect, { target: { value: "0" } });

    const periodInput = screen.getByRole("spinbutton", { name: /固定节次|节次/i });
    fireEvent.change(periodInput, { target: { value: "8" } });

    // Save and assert payload contains fixed_slots with weekday 0 and period 7 (0-based) or normalized { weekday: 0, period: 7 }
    const saveBtn = screen.getByRole("button", { name: /保存基础数据/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          course_requirements: expect.arrayContaining([
            expect.objectContaining({
              id: "req1",
              fixed_slots: [{ weekday: 0, period: 7 }],
            }),
          ]),
        })
      );
    });

    // Remove fixed slot
    const removeSlotBtn = screen.getByRole("button", { name: /删除固定时间|移除固定时间/i });
    fireEvent.click(removeSlotBtn);

    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateCatalog).toHaveBeenCalledWith(
        expect.objectContaining({
          course_requirements: expect.arrayContaining([
            expect.objectContaining({
              id: "req1",
              fixed_slots: [],
            }),
          ]),
        })
      );
    });
  });

  it("limits fixed-slot controls to settings and chooses the next unused slot", async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /课程要求/i })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: /课程要求/i }));

    const addButton = screen.getByRole("button", { name: /添加固定时间/i });
    fireEvent.click(addButton);
    fireEvent.click(addButton);

    const weekdaySelects = screen.getAllByRole("combobox", { name: "固定星期" });
    const periodInputs = screen.getAllByRole("spinbutton", { name: "固定节次" });

    expect(weekdaySelects).toHaveLength(2);
    expect(Array.from(weekdaySelects[0].options, (option) => option.textContent)).toEqual([
      "星期一",
      "星期二",
      "星期三",
      "星期四",
      "星期五",
    ]);
    expect(periodInputs.map((input) => input.value)).toEqual(["1", "2"]);
    expect(periodInputs.every((input) => input.max === "8")).toBe(true);
  });
});
