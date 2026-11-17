import { describe, expect, it } from "vitest";
import { getTrackCardDescription } from "#/components/features/tracks/get-track-card-description";
import type { TrackInfo } from "#/types/settings";

function buildTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    name: "test",
    type: "knowledge",
    source: null,
    ...overrides,
  };
}

describe("getTrackCardDescription", () => {
  it("prefers the API description field when present", () => {
    expect(
      getTrackCardDescription(
        buildTrack({ description: "From API", content: "ignored body" }),
      ),
    ).toBe("From API");
  });

  it("reads description from YAML frontmatter in content", () => {
    const content = `---
description: SSH helper for remote hosts
name: SSH Microagent
---
# SSH Microagent

Body paragraph that should not be used first.
`;

    expect(getTrackCardDescription(buildTrack({ content }))).toBe(
      "SSH helper for remote hosts",
    );
  });

  it("falls back to the first body paragraph when no description exists", () => {
    const content = `# My Track

First paragraph for the card.

Second paragraph.`;

    expect(getTrackCardDescription(buildTrack({ content }))).toBe(
      "First paragraph for the card.",
    );
  });

  it("returns an empty string when neither description nor content exists", () => {
    expect(getTrackCardDescription(buildTrack())).toBe("");
  });
});
