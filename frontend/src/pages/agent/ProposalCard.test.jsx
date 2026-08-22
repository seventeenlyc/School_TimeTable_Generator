import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ProposalCard from "./ProposalCard";

describe("ProposalCard", () => {
  it("renders proposal card with real backend response shape and handles select", () => {
    const proposal = {
      id: "p1",
      strategy: "absence_same_slot_substitute",
      explanation: "所有受影响课程由同科教师代课。",
      score: {
        strategy_tier: 0,
        changed_cells: 0,
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
          after_label: "张老师 · 数学",
        },
      ],
      warnings: [],
    };

    const handleSelect = vi.fn();

    render(
      <ProposalCard
        proposal={proposal}
        index={0}
        isRecommended={true}
        onSelect={handleSelect}
      />
    );

    expect(screen.getByText("所有受影响课程由同科教师代课。")).toBeInTheDocument();
    expect(screen.getByText(/同科代课策略/)).toBeInTheDocument();
    expect(screen.getByText(/变动格\s*0/)).toBeInTheDocument();
    expect(screen.getByText(/影响班级\s*1/)).toBeInTheDocument();
    expect(screen.getByText(/影响教师\s*2/)).toBeInTheDocument();
    expect(screen.getByText(/李老师 · 数学/)).toBeInTheDocument();
    expect(screen.getByText(/张老师 · 数学/)).toBeInTheDocument();
    expect(screen.getByText(/第\s*3\s*节/)).toBeInTheDocument();

    const selectBtn = screen.getByRole("button", { name: /选择并应用此方案|选择/i });
    fireEvent.click(selectBtn);

    expect(handleSelect).toHaveBeenCalledTimes(1);
    expect(handleSelect).toHaveBeenCalledWith(proposal);
  });
});
