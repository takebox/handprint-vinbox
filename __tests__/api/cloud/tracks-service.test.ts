import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "#/api/backend-registry/active-store";
import type { Backend } from "#/api/backend-registry/types";
import TracksService from "#/api/tracks-service";
import { getFetchCall, mockJsonResponse } from "./fetch-test-utils";

const cloudBackend: Backend = {
  id: "prod",
  name: "Production",
  host: "https://app.all-hands.dev",
  apiKey: "bearer-token",
  kind: "cloud",
};

const originalFetch = global.fetch;
const fetchMock = vi.fn();

beforeEach(() => {
  window.localStorage.clear();
  __resetActiveStoreForTests();
  setRegisteredBackends([cloudBackend]);
  setActiveSelection({ backendId: cloudBackend.id });
  fetchMock.mockReset();
  global.fetch = fetchMock as typeof fetch;
});

afterEach(() => {
  window.localStorage.clear();
  __resetActiveStoreForTests();
  fetchMock.mockReset();
  global.fetch = originalFetch;
});

describe("TracksService.getTracks against cloud backend", () => {
  it("paginates /api/v1/tracks/search directly and returns the merged list", async () => {
    fetchMock
      .mockResolvedValueOnce(
        mockJsonResponse({
          items: [
            { name: "alpha", type: "knowledge", source: "global" },
            {
              name: "beta",
              type: "task",
              source: "user",
              triggers: ["foo"],
            },
          ],
          next_page_id: "beta",
        }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          items: [{ name: "gamma", type: "knowledge", source: "user" }],
          next_page_id: null,
        }),
      );

    const tracks = await TracksService.getTracks();

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [firstUrl, firstInit] = getFetchCall(fetchMock, 0);
    expect(firstInit).toMatchObject({
      method: "GET",
      headers: { Authorization: "Bearer bearer-token" },
    });
    expect(firstUrl).toMatch(
      /^https:\/\/app\.all-hands\.dev\/api\/v1\/tracks\/search\?/,
    );
    expect(firstUrl).not.toContain("page_id=");

    const [secondUrl] = getFetchCall(fetchMock, 1);
    expect(secondUrl).toContain("page_id=beta");

    expect(tracks.map((s) => s.name)).toEqual(["alpha", "beta", "gamma"]);
    expect(tracks[1]).toMatchObject({ triggers: ["foo"] });
  });
});

describe("TracksService.getConversationTracks against cloud backend", () => {
  it("reads the conversation's own tracks route and maps entries to TrackInfo", async () => {
    // Arrange
    fetchMock.mockResolvedValueOnce(
      mockJsonResponse({
        tracks: [
          {
            name: "release-notes",
            type: "agenttracks",
            content: "# Release notes",
            triggers: ["/release-notes"],
          },
          {
            name: "repo",
            type: "repo",
            content: "Repository instructions",
            triggers: [],
          },
        ],
      }),
    );

    // Act
    const tracks = await TracksService.getConversationTracks("conv-1");

    // Assert
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = getFetchCall(fetchMock, 0);
    expect(url).toBe(
      "https://app.all-hands.dev/api/v1/app-conversations/conv-1/tracks",
    );
    expect(init).toMatchObject({
      method: "GET",
      headers: { Authorization: "Bearer bearer-token" },
    });
    expect(tracks).toEqual([
      {
        name: "release-notes",
        type: "agenttracks",
        content: "# Release notes",
        triggers: ["/release-notes"],
        source: null,
      },
      {
        name: "repo",
        type: "repo",
        content: "Repository instructions",
        triggers: [],
        source: null,
      },
    ]);
  });
});
