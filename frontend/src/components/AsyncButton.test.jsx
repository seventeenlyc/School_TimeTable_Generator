import React from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AsyncButton from "./AsyncButton";

describe("AsyncButton", () => {
  it("disables itself, exposes busy state, and prevents duplicate clicks while loading", async () => {
    const onClick = vi.fn();

    render(
      <AsyncButton loading loadingLabel="保存中…" onClick={onClick}>
        保存基础数据
      </AsyncButton>
    );

    const button = screen.getByRole("button", { name: "保存中…" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(within(button).getByTestId("loading-spinner")).toHaveClass("animate-spin");

    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("keeps the normal children and clears the busy state when idle", () => {
    render(
      <AsyncButton className="custom-button" onClick={() => {}}>
        保存基础数据
      </AsyncButton>
    );

    const button = screen.getByRole("button", { name: "保存基础数据" });
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "false");
    expect(button).toHaveClass("custom-button");
    expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
  });

  it("reserves one content-driven width for idle and loading labels", () => {
    const { rerender } = render(
      <AsyncButton loadingLabel="正在保存特别长的内容…">
        保存
      </AsyncButton>
    );

    const idleButton = screen.getByRole("button", { name: "保存" });
    const idleStack = within(idleButton).getByTestId("async-button-content-stack");
    const idleLayer = within(idleButton).getByTestId("async-button-idle-content");
    const idleLoadingLayer = within(idleButton).getByTestId(
      "async-button-loading-content"
    );

    expect(idleStack).toHaveStyle({ display: "inline-grid" });
    expect(idleLayer).toHaveStyle({ gridArea: "1 / 1", visibility: "visible" });
    expect(idleLoadingLayer).toHaveStyle({ gridArea: "1 / 1", visibility: "hidden" });
    expect(idleLoadingLayer).toHaveAttribute("aria-hidden", "true");

    rerender(
      <AsyncButton loading loadingLabel="正在保存特别长的内容…">
        保存
      </AsyncButton>
    );

    const loadingButton = screen.getByRole("button", {
      name: "正在保存特别长的内容…",
    });
    const loadingStack = within(loadingButton).getByTestId("async-button-content-stack");
    const loadingLayer = within(loadingButton).getByTestId(
      "async-button-loading-content"
    );
    const loadingIdleLayer = within(loadingButton).getByTestId(
      "async-button-idle-content"
    );

    expect(loadingStack).toHaveStyle({ display: "inline-grid" });
    expect(loadingLayer).toHaveStyle({ gridArea: "1 / 1", visibility: "visible" });
    expect(loadingIdleLayer).toHaveStyle({ gridArea: "1 / 1", visibility: "hidden" });
    expect(loadingIdleLayer).toHaveAttribute("aria-hidden", "true");
  });
});
