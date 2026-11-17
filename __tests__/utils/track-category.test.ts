import { describe, expect, it } from "vitest";
import { TRACK_CATEGORY_IDS } from "@handprint-ai/extensions/tracks";
import type { TrackInfo } from "#/types/settings";
import {
  getTrackCategory,
  TRACK_CATEGORY_ICONS,
  TRACK_CATEGORY_LABEL_KEYS,
  TRACK_CATEGORY_ORDER,
} from "#/utils/track-category";

function buildTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return { name: "test-track", type: "knowledge", source: null, ...overrides };
}

describe("track-category", () => {
  it("returns the catalog category when it is known", () => {
    expect(getTrackCategory(buildTrack({ category: "environment" }))).toBe(
      "environment",
    );
  });

  it.each([
    ["missing", undefined],
    ["null", null],
    ["unknown to this build", "code-hostig" as never],
  ])("falls back to other when the category is %s", (_label, category) => {
    expect(getTrackCategory(buildTrack({ category }))).toBe("other");
  });

  it("covers every catalog category in the rail order, labels, and icons", () => {
    const ids = [...TRACK_CATEGORY_IDS].sort();
    expect([...TRACK_CATEGORY_ORDER].sort()).toEqual(ids);
    expect(Object.keys(TRACK_CATEGORY_LABEL_KEYS).sort()).toEqual(ids);
    expect(Object.keys(TRACK_CATEGORY_ICONS).sort()).toEqual(ids);
  });
});
