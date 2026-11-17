import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nKey } from "#/i18n/declaration";
import { TrackFacetRail } from "#/components/features/tracks/track-facet-rail";
import type { TrackFacetGroup } from "#/components/features/tracks/track-filter";

function buildGroups(): TrackFacetGroup[] {
  return [
    {
      id: "category",
      labelKey: I18nKey.SETTINGS$TRACKS_FACET_CATEGORY,
      rows: [
        {
          value: "environment",
          labelKey: I18nKey.SETTINGS$TRACKS_CATEGORY_ENVIRONMENT,
          count: 10,
          checked: false,
          disabled: false,
        },
        {
          value: "writing",
          labelKey: I18nKey.SETTINGS$TRACKS_CATEGORY_WRITING,
          count: 0,
          checked: false,
          disabled: true,
        },
      ],
    },
  ];
}

describe("TrackFacetRail", () => {
  it("renders nothing when no group is visible", () => {
    render(<TrackFacetRail groups={[]} onToggle={vi.fn()} />);
    expect(screen.queryByTestId("track-facet-rail")).not.toBeInTheDocument();
  });

  it("renders each row with its count and checked state", () => {
    render(<TrackFacetRail groups={buildGroups()} onToggle={vi.fn()} />);

    const row = screen.getByTestId("track-facet-category-environment");
    expect(row).toHaveAttribute("aria-checked", "false");
    expect(row).toHaveTextContent("10");
    expect(
      screen.getByTestId("track-facet-group-category"),
    ).toBeInTheDocument();
  });

  it("reports the group and value when a row is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TrackFacetRail groups={buildGroups()} onToggle={onToggle} />);

    await user.click(screen.getByTestId("track-facet-category-environment"));

    expect(onToggle).toHaveBeenCalledWith("category", "environment");
  });

  it("does not report clicks on a disabled zero-count row", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TrackFacetRail groups={buildGroups()} onToggle={onToggle} />);

    await user.click(screen.getByTestId("track-facet-category-writing"));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
