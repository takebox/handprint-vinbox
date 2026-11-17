import { describe, expect, it } from "vitest";
import type { TrackInfo } from "#/types/settings";
import { getTrackScope, groupTracksByScope } from "#/utils/track-scope";

function buildTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    name: "test-track",
    type: "knowledge",
    source: null,
    ...overrides,
  };
}

describe("getTrackScope", () => {
  it("classifies public catalog tracks", () => {
    expect(
      getTrackScope(
        buildTrack({
          source: "/Users/test/.handprint/cache/tracks/public-tracks/tracks/deno/TRACK.md",
        }),
      ),
    ).toBe("public");
    expect(getTrackScope(buildTrack({ source: "public" }))).toBe("public");
  });

  it("classifies personal user tracks from home directories", () => {
    expect(
      getTrackScope(
        buildTrack({
          source: "/Users/test/.agents/tracks/my-track/TRACK.md",
        }),
      ),
    ).toBe("personal");
    expect(getTrackScope(buildTrack({ source: "user" }))).toBe("personal");
  });

  it("classifies project tracks from the workspace", () => {
    const projectDir = "/workspace/project/agent-vinbox";
    expect(
      getTrackScope(
        buildTrack({
          source: `${projectDir}/.agents/tracks/default-tools/TRACK.md`,
        }),
        projectDir,
      ),
    ).toBe("project");
    expect(getTrackScope(buildTrack({ source: "project" }))).toBe("project");
  });
});

describe("groupTracksByScope", () => {
  it("groups and sorts tracks by scope", () => {
    const grouped = groupTracksByScope([
      buildTrack({ name: "beta", source: "public" }),
      buildTrack({ name: "alpha", source: "user" }),
      buildTrack({
        name: "gamma",
        source: "/workspace/project/.agents/tracks/gamma/TRACK.md",
      }),
    ], "/workspace/project");

    expect(grouped.public.map((track) => track.name)).toEqual(["beta"]);
    expect(grouped.personal.map((track) => track.name)).toEqual(["alpha"]);
    expect(grouped.project.map((track) => track.name)).toEqual(["gamma"]);
  });
});
