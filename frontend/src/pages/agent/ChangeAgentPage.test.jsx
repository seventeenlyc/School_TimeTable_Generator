import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

  it("submits event and displays proposal cards", async () => {
    api.proposeChange.mockResolvedValueOnce({
      base_revision: 1,
      proposals: [
        {
          id: "prop-1",
          strategy: "direct_substitution",
          summary: "由张老师代李老师的数学课",
          score: { total_cost: 20 },
          operations: [
            {
              date: "2026-09-08",
              period: 2,
              summary: "张老师代课",
            },
          ],
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
