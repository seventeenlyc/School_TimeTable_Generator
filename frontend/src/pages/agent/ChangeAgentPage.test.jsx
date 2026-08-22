import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ChangeAgentPage from "./ChangeAgentPage";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    getState: vi.fn(),
    proposeChange: vi.fn(),
    applyChange: vi.fn(),
  },
}));

describe("ChangeAgentPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getState.mockResolvedValue({
      revision: 1,
      teachers: [{ id: "t1", name: "李老师" }],
      classes: [{ id: "c1", name: "高一(1)班" }],
      subjects: [{ id: "s1", name: "数学" }],
      settings: { periods_per_day: 7 },
      timetable_versions: [],
    });
  });

  it("keeps proposal generation and application disabled while requests are pending", async () => {
    let resolvePropose;
    let resolveApply;
    api.proposeChange.mockReturnValueOnce(new Promise((resolve) => {
      resolvePropose = resolve;
    }));
    api.applyChange.mockReturnValueOnce(new Promise((resolve) => {
      resolveApply = resolve;
    }));

    render(
      <MemoryRouter initialEntries={["/agent"]}>
        <Routes>
          <Route path="/agent" element={<ChangeAgentPage />} />
          <Route path="/" element={<div>首页</div>} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => expect(screen.getByText(/智能调课 Agent/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "智能生成调课方案" }));

    const proposingButton = await screen.findByRole("button", { name: "计算方案中…" });
    expect(proposingButton).toBeDisabled();
    fireEvent.click(proposingButton);
    expect(api.proposeChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolvePropose({ proposals: [{
        id: "prop-1",
        strategy: "absence_same_slot_substitute",
        explanation: "由同科教师代课",
        score: { changed_cells: 1, affected_classes: 1 },
        operations: [],
        warnings: [],
      }] });
      await Promise.resolve();
    });

    await waitFor(() => expect(screen.getByRole("button", { name: /选择并应用此方案/i })).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: /选择并应用此方案/i }));
    fireEvent.click(screen.getByRole("button", { name: "确认应用并更新课表" }));

    const applyingButton = await screen.findByRole("button", { name: "应用中…" });
    expect(applyingButton).toBeDisabled();
    fireEvent.click(applyingButton);
    expect(api.applyChange).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveApply({});
      await Promise.resolve();
    });
  });

  it("submits event and displays proposal cards", async () => {
    api.proposeChange.mockResolvedValueOnce({
      base_revision: 1,
      base_version_id: "ver-1",
      event: {
        id: "evt-1",
        kind: "absence",
        teacher_id: "t1",
        reason: "病假",
        start_date: "2026-09-08",
        end_date: "2026-09-08",
        busy_slots: [],
        status: "pending",
        created_at: "2026-08-22T10:00:00+08:00",
      },
      date_exceptions: [],
      version_candidate: null,
      warnings: [],
      proposals: [
        {
          id: "prop-1",
          strategy: "absence_same_slot_substitute",
          explanation: "由张老师代李老师的数学课",
          score: {
            strategy_tier: 1,
            changed_cells: 1,
            affected_classes: 1,
            affected_teachers: 2,
            moved_split_blocks: 0,
            slot_distance: 0,
          },
          operations: [
            {
              date: "2026-09-08",
              period: 2,
              class_ids: ["c1"],
              kind: "substitute",
              before_label: "李老师 · 数学",
              after_label: "张老师代课",
            },
          ],
          warnings: [],
        },
      ],
    });

    render(
      <MemoryRouter>
        <ChangeAgentPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/智能调课 Agent/i)).toBeInTheDocument();
    });

    const proposeBtn = screen.getByRole("button", { name: /智能生成调课方案/i });
    fireEvent.click(proposeBtn);

    await waitFor(() => {
      expect(api.proposeChange).toHaveBeenCalled();
      expect(screen.getByText(/由张老师代李老师的数学课/i)).toBeInTheDocument();
      expect(screen.getByText(/同科代课策略/i)).toBeInTheDocument();
    });
  });
});
