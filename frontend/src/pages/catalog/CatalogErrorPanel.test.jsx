import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import CatalogErrorPanel from "./CatalogErrorPanel";

describe("CatalogErrorPanel", () => {
  it("locates the first target and then the next target from a keyboard button", () => {
    const onLocate = vi.fn();
    const firstTarget = { tab: "requirements", entityId: "req1", field: "teacher_id" };
    const secondTarget = { tab: "requirements", entityId: "req2", field: "teacher_id" };

    render(
      <CatalogErrorPanel
        errors={[{
          code: "duplicate_course_requirement",
          title: "重复录入",
          message: "课程要求重复录入",
          location: "基础数据 → 课程要求",
          targets: [firstTarget, secondTarget],
        }]}
        onLocate={onLocate}
      />
    );

    const locateButtons = screen.getAllByRole("button", { name: /定位|查看错误位置/ });
    expect(locateButtons[0].tagName).toBe("BUTTON");
    fireEvent.click(locateButtons[0]);
    expect(onLocate).toHaveBeenNthCalledWith(1, firstTarget);

    fireEvent.click(screen.getByRole("button", { name: /查看下一处/ }));
    expect(onLocate).toHaveBeenNthCalledWith(2, secondTarget);
  });

  it("clamps the current target when an error rerender removes the selected target", () => {
    const onLocate = vi.fn();
    const firstTarget = { tab: "requirements", entityId: "req1", field: "teacher_id" };
    const secondTarget = { tab: "requirements", entityId: "req2", field: "teacher_id" };
    const error = (targets) => ({
      code: "duplicate_course_requirement",
      title: "重复录入",
      message: "课程要求重复录入",
      location: "基础数据 → 课程要求",
      targets,
    });

    const { rerender } = render(<CatalogErrorPanel errors={[error([firstTarget, secondTarget])]} onLocate={onLocate} />);
    fireEvent.click(screen.getByRole("button", { name: /查看下一处/ }));
    rerender(<CatalogErrorPanel errors={[error([firstTarget])]} onLocate={onLocate} />);

    expect(screen.getByText("1/1")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /查看错误位置/ }));
    expect(onLocate).toHaveBeenLastCalledWith(firstTarget);
  });
});
