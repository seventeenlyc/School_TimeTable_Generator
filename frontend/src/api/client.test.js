import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { api } from "./client";

describe("api client", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("getState calls /api/state", async () => {
    const mockState = { revision: 1, classes: [] };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockState,
    });

    const result = await api.getState();
    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/state",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
      })
    );
    expect(result).toEqual(mockState);
  });

  it("proposeChange sends event payload to /api/change-proposals", async () => {
    const mockProposals = { base_revision: 1, proposals: [] };
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockProposals,
    });

    const event = { id: "evt_1", event_type: "absence", teacher_id: "T1" };
    const result = await api.proposeChange(event);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:8000/api/change-proposals",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ event }),
      })
    );
    expect(result).toEqual(mockProposals);
  });

  it("handles non-ok response throwing error with status and payload", async () => {
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ detail: { code: "revision_conflict", message: "conflict" } }),
    });

    await expect(api.updateSettings({})).rejects.toMatchObject({
      status: 409,
      message: "conflict",
    });
  });
});
