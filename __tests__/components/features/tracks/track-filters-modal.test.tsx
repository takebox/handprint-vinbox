import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { I18nKey } from "#/i18n/declaration";
import { TrackFiltersModal } from "#/components/features/tracks/track-filters-modal";
import type { TrackFacetGroup } from "#/components/features/tracks/track-filter";

function buildGroups(): TrackFacetGroup[] {
  return [
    {
      id: "type",
      labelKey: I18nKey.SETTINGS$TRACKS_FACET_TYPE,
      rows: [
        {
          value: "repo",
          labelKey: I18nKey.SETTINGS$TRACKS_TYPE_REPO,
          count: 1,
          checked: false,
          disabled: false,
        },
        {
          value: "knowledge",
          labelKey: I18nKey.SETTINGS$TRACKS_TYPE_KNOWLEDGE,
          count: 2,
          checked: false,
          disabled: false,
        },
      ],
    },
  ];
}

describe("TrackFiltersModal", () => {
  it("toggles a facet through the same rail the desktop uses", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    render(
      <TrackFiltersModal
        groups={buildGroups()}
        activeCount={0}
        onToggle={onToggle}
        onClearAll={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    await user.click(screen.getByTestId("track-facet-type-repo"));

    expect(onToggle).toHaveBeenCalledWith("type", "repo");
  });

  it("hides the clear action when nothing is filtered", () => {
    render(
      <TrackFiltersModal
        groups={buildGroups()}
        activeCount={0}
        onToggle={vi.fn()}
        onClearAll={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(
      screen.queryByTestId("track-filters-modal-clear"),
    ).not.toBeInTheDocument();
  });

  it("clears filters and closes on demand", async () => {
    const user = userEvent.setup();
    const onClearAll = vi.fn();
    const onClose = vi.fn();

    render(
      <TrackFiltersModal
        groups={buildGroups()}
        activeCount={2}
        onToggle={vi.fn()}
        onClearAll={onClearAll}
        onClose={onClose}
      />,
    );

    await user.click(screen.getByTestId("track-filters-modal-clear"));
    expect(onClearAll).toHaveBeenCalled();

    await user.click(screen.getByTestId("track-filters-modal-done"));
    expect(onClose).toHaveBeenCalled();
  });
});
