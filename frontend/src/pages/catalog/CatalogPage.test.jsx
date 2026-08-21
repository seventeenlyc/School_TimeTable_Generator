import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CatalogPage from "./CatalogPage";
import { api } from "../../api/client";

vi.mock("../../api/client", () => ({
  api: {
    getState: vi.fn(),
    updateCatalog: vi.fn(),
  },
}));

describe("CatalogPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getState.mockResolvedValue({
      revision: 1,
      classes: [{ id: "c1", name: "高一(1)班" }],
      teachers: [{ id: "t1", name: "张老师", qualified_subject_ids: [] }],
      rooms: [{ id: "r1", name: "301教室" }],
      subjects: [{ id: "s1", name: "数学" }],
      course_requirements: [],
      split_course_blocks: [],
    });
  });

  it("renders catalog tabs and initial data", async () => {
    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByText(/高一\(1\)班/i)).toBeInTheDocument();
      expect(screen.getByText(/基础排课数据管理/i)).toBeInTheDocument();
    });
  });

  it("saves updated catalog sending payload to api", async () => {
    api.updateCatalog.mockResolvedValueOnce({
      revision: 2,
      classes: [{ id: "c1", name: "高一(1)班" }],
      teachers: [{ id: "t1", name: "张老师" }],
      rooms: [],
      subjects: [],
      course_requirements: [],
      split_course_blocks: [],
    });

    render(<CatalogPage />);

    await waitFor(() => {
      expect(screen.getByText(/高一\(1\)班/i)).toBeInTheDocument();
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
});
