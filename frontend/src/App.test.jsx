import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { api } from "./api/client";

vi.mock("./api/client", () => ({
  api: {
    getState: vi.fn(),
    listTimetables: vi.fn(),
  },
}));

describe("App routing and auth-free shell", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getState.mockResolvedValue({
      revision: 1,
      classes: [],
      teachers: [],
      rooms: [],
      timetable_versions: [],
    });
    api.listTimetables.mockResolvedValue([]);
  });

  it("renders DashboardPage at / without requiring auth", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/排课调度专家/i)).toBeInTheDocument();
    expect(await screen.findByText(/课表管理工作台/i)).toBeInTheDocument();
    expect(await screen.findByText("暂无生成的课表版本")).toBeInTheDocument();
  });

  it("redirects obsolete /login route to root dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    expect(await screen.findByText(/课表管理工作台/i)).toBeInTheDocument();
    expect(await screen.findByText("暂无生成的课表版本")).toBeInTheDocument();
  });

  it("renders timetable link pointing to /timetables/:id on dashboard", async () => {
    api.getState.mockResolvedValue({
      revision: 1,
      classes: [],
      teachers: [],
      rooms: [],
      timetable_versions: [
        {
          id: "ver-1",
          name: "2026秋季课表",
          effective_from: "2026-09-01",
          is_active: true,
        },
      ],
    });
    api.listTimetables.mockResolvedValue([
      {
        id: "ver-1",
        name: "2026秋季课表",
        effective_from: "2026-09-01",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>
    );

    const link = await screen.findByRole("link", { name: "查看课表" });
    expect(link).toHaveAttribute("href", "/timetables/ver-1");
    expect(document.querySelector('a[href="/display/ver-1"]')).toBeNull();
  });
});
