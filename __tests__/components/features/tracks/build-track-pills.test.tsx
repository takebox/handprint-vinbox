import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import { buildTrackPills } from "#/components/features/tracks/build-track-pills";
import type { TrackCardPill } from "#/components/features/tracks/track-card-pill-row";
import type { TrackInfo } from "#/types/settings";

/** Returns its key unchanged, for assertions that do not care about copy. */
const translate = ((key: string) => key) as TFunction;

function buildTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    name: "deno",
    type: "knowledge",
    source: "public",
    category: "environment",
    triggers: [],
    ...overrides,
  };
}

/** Mounts the built pills so their rendered output can be asserted. */
function renderPills(pills: TrackCardPill[]) {
  render(
    <div>
      {pills.map((pill) => (
        <span key={pill.id}>{pill.node}</span>
      ))}
    </div>,
  );
}

describe("buildTrackPills category pill", () => {
  it("renders the catalog category", () => {
    renderPills(
      buildTrackPills(buildTrack({ category: "environment" }), translate),
    );

    expect(screen.getByTestId("track-category-deno")).toHaveTextContent(
      "SETTINGS$TRACKS_CATEGORY_ENVIRONMENT",
    );
  });

  it("omits the pill when the track is uncategorized", () => {
    renderPills(buildTrackPills(buildTrack({ category: null }), translate));

    expect(screen.queryByTestId("track-category-deno")).not.toBeInTheDocument();
  });

  it("places the category pill directly after the type badge", () => {
    // Order is asserted on pill ids, so no rendering is needed here.
    const pills = buildTrackPills(buildTrack(), translate);

    expect(pills[0]!.id).toBe("type-knowledge");
    expect(pills[1]!.id).toBe("category-environment");
  });
});
