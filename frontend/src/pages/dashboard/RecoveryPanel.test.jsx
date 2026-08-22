import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
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

  it("keeps restore disabled while the recovery request is pending", async () => {
    let resolveRestore;
    const onRestored = vi.fn();
    api.listBackups.mockResolvedValueOnce([{ name: "backup-20260821-120000.json" }]);
    api.restoreBackup.mockReturnValueOnce(new Promise((resolve) => {
      resolveRestore = resolve;
    }));

    render(<RecoveryPanel onRestored={onRestored} />);
    await waitFor(() => expect(screen.getByText("backup-20260821-120000.json")).toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: /从选定快照恢复/i }));
    fireEvent.click(screen.getByRole("button", { name: "确认恢复" }));

    const pendingButton = await screen.findByRole("button", { name: "恢复中…" });
    expect(pendingButton).toBeDisabled();
    fireEvent.click(pendingButton);
    expect(api.restoreBackup).toHaveBeenCalledTimes(1);

    vi.useFakeTimers();
    try {
      await act(async () => {
        resolveRestore({ ok: true });
        await Promise.resolve();
      });
      expect(screen.getByText(/数据恢复成功/i)).toBeInTheDocument();

      await act(async () => {
        vi.advanceTimersByTime(1000);
      });
      expect(onRestored).toHaveBeenCalledTimes(1);
    } finally {
      vi.clearAllTimers();
      vi.useRealTimers();
    }
  });
});
