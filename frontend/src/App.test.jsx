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
    expect(screen.getByText(/课表管理工作台/i)).toBeInTheDocument();
  });

  it("redirects obsolete /login route to root dashboard", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <App />
      </MemoryRouter>
    );

    expect(screen.getByText(/课表管理工作台/i)).toBeInTheDocument();
  });
});
