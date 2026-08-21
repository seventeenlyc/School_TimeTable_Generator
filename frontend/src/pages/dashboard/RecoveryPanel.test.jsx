import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import RecoveryPanel from "./RecoveryPanel";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    listBackups: vi.fn(),
    restoreBackup: vi.fn(),
  },
}));

describe("RecoveryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads and displays backup snapshots", async () => {
    api.listBackups.mockResolvedValueOnce([
      { name: "backup-20260821-120000.json" },
      { name: "backup-20260821-110000.json" },
    ]);

    render(<RecoveryPanel onRestored={vi.fn()} />);

    expect(screen.getByText(/正在加载备份快照/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("backup-20260821-120000.json")).toBeInTheDocument();
      expect(screen.getByText("backup-20260821-110000.json")).toBeInTheDocument();
    });
  });

  it("requires confirmation before triggering restore", async () => {
    api.listBackups.mockResolvedValueOnce([
      { name: "backup-20260821-120000.json" },
    ]);
    api.restoreBackup.mockResolvedValueOnce({ ok: true });

    render(<RecoveryPanel onRestored={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("backup-20260821-120000.json")).toBeInTheDocument();
    });

    const restoreBtn = screen.getByRole("button", { name: /从选定快照恢复/i });
    fireEvent.click(restoreBtn);

    const confirmBtn = screen.getByRole("button", { name: /确认恢复/i });
    expect(confirmBtn).toBeInTheDocument();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.restoreBackup).toHaveBeenCalledWith("backup-20260821-120000.json");
    });
  });
});
