import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useCatalogLocator } from "./useCatalogLocator";

describe("useCatalogLocator", () => {
  let previousRequestAnimationFrame;
  let previousCancelAnimationFrame;

  afterEach(() => {
    vi.useRealTimers();
    window.requestAnimationFrame = previousRequestAnimationFrame;
    window.cancelAnimationFrame = previousCancelAnimationFrame;
  });

  it("clears the previous new-entity timer before the next animation frame", () => {
    vi.useFakeTimers();
    previousRequestAnimationFrame = window.requestAnimationFrame;
    previousCancelAnimationFrame = window.cancelAnimationFrame;

    const pendingFrames = new Map();
    let frameId = 0;
    window.requestAnimationFrame = (callback) => {
      const id = ++frameId;
      pendingFrames.set(id, callback);
      return id;
    };
    window.cancelAnimationFrame = (id) => pendingFrames.delete(id);

    const firstNode = document.createElement("section");
    const secondNode = document.createElement("section");
    const { result } = renderHook(() => useCatalogLocator(vi.fn()));

    act(() => {
      result.current.registerEntity("teachers", "teacher-1", firstNode);
      result.current.registerEntity("teachers", "teacher-2", secondNode);
      result.current.markNewEntity({ tab: "teachers", entityId: "teacher-1", field: "name" });
    });
    act(() => {
      const firstFrame = pendingFrames.keys().next().value;
      pendingFrames.get(firstFrame)?.();
      pendingFrames.delete(firstFrame);
    });

    act(() => {
      result.current.markNewEntity({ tab: "teachers", entityId: "teacher-2", field: "name" });
    });
    act(() => {
      vi.advanceTimersByTime(400);
    });

    act(() => {
      for (const callback of pendingFrames.values()) callback();
      pendingFrames.clear();
    });

    expect(secondNode).toHaveClass("catalog-record-enter");
  });
});
