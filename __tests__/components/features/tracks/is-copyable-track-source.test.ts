import { describe, expect, it } from "vitest";
import { isCopyableTrackSource } from "#/components/features/tracks/is-copyable-track-source";

describe("isCopyableTrackSource", () => {
  it("returns false for scope labels and empty values", () => {
    expect(isCopyableTrackSource(null)).toBe(false);
    expect(isCopyableTrackSource("")).toBe(false);
    expect(isCopyableTrackSource("global")).toBe(false);
    expect(isCopyableTrackSource("agent")).toBe(false);
  });

  it("returns true for filesystem paths and URLs", () => {
    expect(isCopyableTrackSource("/tracks/deno/TRACK.md")).toBe(true);
    expect(isCopyableTrackSource(".agents/tracks/foo/TRACK.md")).toBe(true);
    expect(
      isCopyableTrackSource("https://github.com/example/tracks"),
    ).toBe(true);
  });
});
