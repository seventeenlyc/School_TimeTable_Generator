import React, { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import SplitCourseBlockEditor from "./SplitCourseBlockEditor";

describe("SplitCourseBlockEditor", () => {
  const sampleClasses = [
    { id: "c1", name: "高一(1)班" },
    { id: "c2", name: "高一(2)班" },
  ];

  const sampleSubjects = [
    { id: "sub_geo", name: "地理" },
    { id: "sub_pol", name: "政治" },
  ];

  const sampleTeachers = [
    { id: "t1", name: "张老师", qualified_subject_ids: ["sub_geo"] },
    { id: "t2", name: "王老师", qualified_subject_ids: ["sub_pol"] },
  ];

  const sampleRooms = [
    { id: "r1", name: "301教室" },
    { id: "r2", name: "302教室" },
  ];

  function ControlledHarness({ initialBlock, onChangeSpy, onRemove }) {
    const [block, setBlock] = useState(
      initialBlock || {
        id: "split-1",
        name: "",
        source_class_ids: [],
        periods_per_week: 1,
        groups: [],
      }
    );

    const handleChange = (nextBlock) => {
      setBlock(nextBlock);
      if (onChangeSpy) {
        onChangeSpy(nextBlock);
      }
    };

    return (
      <div>
        <SplitCourseBlockEditor
          block={block}
          classes={sampleClasses}
          subjects={sampleSubjects}
          teachers={sampleTeachers}
          rooms={sampleRooms}
          onChange={handleChange}
          onRemove={onRemove}
        />
        <div data-testid="harness-state">{JSON.stringify(block)}</div>
      </div>
    );
  }

  it("handles user filling name, selecting source classes, adding two groups with options, showing summary, and invoking onChange with stable id and snake_case fields", () => {
    const onChangeSpy = vi.fn();
    render(<ControlledHarness onChangeSpy={onChangeSpy} />);

    // 1. Fill name "地理/政治走班"
    const nameInput = screen.getByLabelText(/走班课程名称|课程名称|名称/i);
    fireEvent.change(nameInput, { target: { value: "地理/政治走班" } });

    // 2. Select two source classes: c1 and c2
    const class1Checkbox = screen.getByRole("checkbox", { name: /高一\(1\)班/i });
    const class2Checkbox = screen.getByRole("checkbox", { name: /高一\(2\)班/i });
    fireEvent.click(class1Checkbox);
    fireEvent.click(class2Checkbox);

    // 3. Add first group
    const addGroupBtn = screen.getByRole("button", { name: /添加分组|新增分组|添加组/i });
    fireEvent.click(addGroupBtn);

    // Fill first group: 地理, 张老师, 301教室
    const groupItemsAfterFirstAdd = screen.getAllByRole("group", { name: /分组|走班组/i });
    expect(groupItemsAfterFirstAdd).toHaveLength(1);
    const group1 = groupItemsAfterFirstAdd[0];

    const group1SubjectSelect = within(group1).getByRole("combobox", { name: /科目|课程/i });
    fireEvent.change(group1SubjectSelect, { target: { value: "sub_geo" } });

    const group1TeacherSelect = within(group1).getByRole("combobox", { name: /教师|任课教师/i });
    fireEvent.change(group1TeacherSelect, { target: { value: "t1" } });

    const group1RoomSelect = within(group1).getByRole("combobox", { name: /教室|上课教室/i });
    fireEvent.change(group1RoomSelect, { target: { value: "r1" } });

    // 4. Add second group
    fireEvent.click(addGroupBtn);

    const groupItemsAfterSecondAdd = screen.getAllByRole("group", { name: /分组|走班组/i });
    expect(groupItemsAfterSecondAdd).toHaveLength(2);
    const group2 = groupItemsAfterSecondAdd[1];

    const group2SubjectSelect = within(group2).getByRole("combobox", { name: /科目|课程/i });
    fireEvent.change(group2SubjectSelect, { target: { value: "sub_pol" } });

    const group2TeacherSelect = within(group2).getByRole("combobox", { name: /教师|任课教师/i });
    fireEvent.change(group2TeacherSelect, { target: { value: "t2" } });

    const group2RoomSelect = within(group2).getByRole("combobox", { name: /教室|上课教室/i });
    fireEvent.change(group2RoomSelect, { target: { value: "r2" } });

    // Assert summary displays both classes and both groups
    const summaryContainer = screen.getByRole("region", { name: /摘要|走班摘要|课程摘要/i });
    expect(summaryContainer).toHaveTextContent(/高一\(1\)班/);
    expect(summaryContainer).toHaveTextContent(/高一\(2\)班/);
    expect(summaryContainer).toHaveTextContent(/地理/);
    expect(summaryContainer).toHaveTextContent(/张老师/);
    expect(summaryContainer).toHaveTextContent(/301教室/);
    expect(summaryContainer).toHaveTextContent(/政治/);
    expect(summaryContainer).toHaveTextContent(/王老师/);
    expect(summaryContainer).toHaveTextContent(/302教室/);

    // Assert final onChange / harness output has stable id and correct snake_case fields
    const harnessState = JSON.parse(screen.getByTestId("harness-state").textContent);
    expect(harnessState.id).toBe("split-1");
    expect(harnessState.name).toBe("地理/政治走班");
    expect(harnessState.source_class_ids).toEqual(["c1", "c2"]);
    expect(harnessState.groups).toHaveLength(2);
    expect(harnessState.groups[0]).toEqual(
      expect.objectContaining({
        subject_id: "sub_geo",
        teacher_id: "t1",
        room_id: "r1",
      })
    );
    expect(harnessState.groups[1]).toEqual(
      expect.objectContaining({
        subject_id: "sub_pol",
        teacher_id: "t2",
        room_id: "r2",
      })
    );
  });

  it("does not duplicate selected source classes and disables subject/teacher/room options already chosen by other groups", () => {
    const initialBlock = {
      id: "split-1",
      name: "选课走班",
      source_class_ids: ["c1"],
      periods_per_week: 2,
      groups: [
        {
          id: "grp-1",
          subject_id: "sub_geo",
          teacher_id: "t1",
          room_id: "r1",
        },
        {
          id: "grp-2",
          subject_id: "",
          teacher_id: "",
          room_id: "",
        },
      ],
    };

    render(<ControlledHarness initialBlock={initialBlock} />);

    // Check source classes do not duplicate when re-checked or inspected
    const class1Checkbox = screen.getByRole("checkbox", { name: /高一\(1\)班/i });
    expect(class1Checkbox).toBeChecked();

    const groups = screen.getAllByRole("group", { name: /分组|走班组/i });
    expect(groups).toHaveLength(2);

    // In group 2, options selected in group 1 (sub_geo, t1, r1) should be disabled
    const group2SubjectSelect = within(groups[1]).getByRole("combobox", { name: /科目|课程/i });
    const geoOption = within(group2SubjectSelect).getByRole("option", { name: /地理/i });
    const polOption = within(group2SubjectSelect).getByRole("option", { name: /政治/i });
    expect(geoOption).toBeDisabled();
    expect(polOption).not.toBeDisabled();

    const group2TeacherSelect = within(groups[1]).getByRole("combobox", { name: /教师|任课教师/i });
    const t1Option = within(group2TeacherSelect).getByRole("option", { name: /张老师/i });
    const t2Option = within(group2TeacherSelect).getByRole("option", { name: /王老师/i });
    expect(t1Option).toBeDisabled();
    expect(t2Option).not.toBeDisabled();

    const group2RoomSelect = within(groups[1]).getByRole("combobox", { name: /教室|上课教室/i });
    const r1Option = within(group2RoomSelect).getByRole("option", { name: /301教室/i });
    const r2Option = within(group2RoomSelect).getByRole("option", { name: /302教室/i });
    expect(r1Option).toBeDisabled();
    expect(r2Option).not.toBeDisabled();
  });

  it("updates block when deleting a group without mutating or generating a new block id", () => {
    const initialBlock = {
      id: "split-fixed-id",
      name: "三班走班",
      source_class_ids: ["c1", "c2"],
      periods_per_week: 2,
      groups: [
        { id: "grp-1", subject_id: "sub_geo", teacher_id: "t1", room_id: "r1" },
        { id: "grp-2", subject_id: "sub_pol", teacher_id: "t2", room_id: "r2" },
      ],
    };

    render(<ControlledHarness initialBlock={initialBlock} />);

    let groups = screen.getAllByRole("group", { name: /分组|走班组/i });
    expect(groups).toHaveLength(2);

    // Delete group 1
    const deleteFirstGroupBtn = within(groups[0]).getByRole("button", { name: /删除分组|删除组|移除/i });
    fireEvent.click(deleteFirstGroupBtn);

    // Verify only one group remains and block id is unchanged
    groups = screen.getAllByRole("group", { name: /分组|走班组/i });
    expect(groups).toHaveLength(1);

    const harnessState = JSON.parse(screen.getByTestId("harness-state").textContent);
    expect(harnessState.id).toBe("split-fixed-id");
    expect(harnessState.groups).toHaveLength(1);
    expect(harnessState.groups[0].id).toBe("grp-2");
  });
});
