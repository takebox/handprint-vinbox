import { TracksClient } from "@handprint-ai/typescript-client/clients";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetActiveStoreForTests,
  setActiveSelection,
  setRegisteredBackends,
} from "#/api/backend-registry/active-store";
import type { Backend } from "#/api/backend-registry/types";

const { mockGetTracks, MOCK_PUBLIC_CATALOG } = vi.hoisted(() => ({
  mockGetTracks: vi.fn(),
  MOCK_PUBLIC_CATALOG: [
    {
      name: "mock-public-track",
      description: "A mock public track",
      triggers: ["mock"],
      content: "mock content",
    },
    {
      name: "another-public-track",
      description: "Another one",
      triggers: [],
      content: "more content",
      license: "MIT",
    },
  ],
}));

vi.mock("@handprint-ai/typescript-client/clients", () => ({
  TracksClient: vi.fn(function TracksClientMock() {
    return { getTracks: mockGetTracks };
  }),
}));

vi.mock("@handprint-ai/extensions/tracks", () => ({
  TRACKS_CATALOG: MOCK_PUBLIC_CATALOG,
}));

import TracksService from "#/api/tracks-service";

const localBackend: Backend = {
  id: "local",
  name: "Local",
  host: "http://127.0.0.1:8000",
  apiKey: "",
  kind: "local",
};

beforeEach(() => {
  window.localStorage.clear();
  __resetActiveStoreForTests();
  setRegisteredBackends([localBackend]);
  setActiveSelection({ backendId: localBackend.id });
  mockGetTracks.mockReset();
  vi.mocked(TracksClient).mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  __resetActiveStoreForTests();
});

describe("TracksService.getTracks against the agent-server backend", () => {
  it("requests only user/project tracks from agent-server (load_public: false) and appends the bundled public catalog", async () => {
    const userTrack = {
      name: "my-custom-track",
      type: "knowledge",
      content: "custom content",
      triggers: [],
      source: "user",
      is_agenttracks_format: false,
    };
    mockGetTracks.mockResolvedValue({
      tracks: [userTrack],
      sources: { sandbox: 0, sdk_base: 0, org: 0, project: 0 },
    });

    const tracks = await TracksService.getTracks();

    // Agent-server is asked only for user/project tracks, not public.
    expect(mockGetTracks).toHaveBeenCalledTimes(1);
    expect(mockGetTracks.mock.calls[0]?.[0]).toMatchObject({
      load_public: false,
      load_user: true,
      load_project: true,
      load_org: false,
    });

    // Result = local tracks first, then all bundled public tracks.
    expect(tracks[0]?.name).toBe("my-custom-track");
    expect(tracks).toHaveLength(1 + MOCK_PUBLIC_CATALOG.length);

    // Every public track from the bundled catalog is present.
    const publicNames = tracks.slice(1).map((s) => s.name);
    for (const entry of MOCK_PUBLIC_CATALOG) {
      expect(publicNames).toContain(entry.name);
    }
    expect(tracks.slice(1).every((s) => s.source === "public")).toBe(true);
  });

  it("returns only bundled public tracks when agent-server is unreachable", async () => {
    mockGetTracks.mockRejectedValue(new Error("ECONNREFUSED"));

    const tracks = await TracksService.getTracks();

    expect(tracks).toHaveLength(MOCK_PUBLIC_CATALOG.length);
    expect(tracks.every((s) => s.source === "public")).toBe(true);
  });
});
