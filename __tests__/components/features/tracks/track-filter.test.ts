import { describe, expect, it } from "vitest";
import { I18nKey } from "#/i18n/declaration";
import type { TrackInfo } from "#/types/settings";
import {
  applyTrackFilters,
  buildTrackFacetGroups,
  clearTrackFilterFacets,
  countActiveFilters,
  EMPTY_TRACK_FILTER_STATE,
  parseTrackFilterState,
  toggleTrackFilterValue,
  toTrackFilterSearchParams,
  type TrackFilterState,
} from "#/components/features/tracks/track-filter";

function buildTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    name: "deno",
    type: "knowledge",
    source: "public",
    category: "environment",
    description: "Initialize and work with Deno projects.",
    triggers: ["deno"],
    ...overrides,
  };
}

/** Public env track, public writing track, personal repo track. */
function buildMixedTracks(): TrackInfo[] {
  return [
    buildTrack({ name: "deno", category: "environment", type: "knowledge" }),
    buildTrack({
      name: "prd",
      category: "writing",
      type: "knowledge",
      description: "Generate a Product Requirements Document.",
      triggers: [],
    }),
    buildTrack({
      name: "house-rules",
      category: null,
      type: "repo",
      source: "/home/dev/.agents/tracks/house-rules/TRACK.md",
      description: "Local conventions.",
      triggers: [],
    }),
  ];
}

/**
 * The filter helpers take enablement as a predicate — resolving the allow-list
 * and deny-list behind it is the caller's job — so these tests express the
 * cases they care about as a deny-set.
 */
function enabledExcept(...names: string[]) {
  const denied = new Set(names);
  return (track: TrackInfo) => !denied.has(track.name);
}

function stateWith(
  overrides: Partial<TrackFilterState> = {},
): TrackFilterState {
  return { ...EMPTY_TRACK_FILTER_STATE, ...overrides };
}

describe("parseTrackFilterState", () => {
  it("reads every facet plus the query", () => {
    const state = parseTrackFilterState(
      new URLSearchParams(
        "q=deno&source=personal&source=public&category=environment&type=repo&state=disabled&recommendation=recommended",
      ),
    );

    expect(state.query).toBe("deno");
    expect([...state.sources]).toEqual(["personal", "public"]);
    expect([...state.categories]).toEqual(["environment"]);
    expect([...state.types]).toEqual(["repo"]);
    expect([...state.states]).toEqual(["disabled"]);
    expect([...state.recommendations]).toEqual(["recommended"]);
  });

  it.each([
    ["source", "source=nonsense"],
    ["category", "category=code-hostig"],
    ["type", "type=bogus"],
    ["state", "state=maybe"],
    ["recommendation", "recommendation=maybe"],
  ])("drops unknown %s values instead of erroring", (_label, search) => {
    const state = parseTrackFilterState(new URLSearchParams(search));
    expect(countActiveFilters(state)).toBe(0);
  });

  it("round-trips through toTrackFilterSearchParams in canonical order", () => {
    const search =
      "q=deno&source=project&source=public&category=environment&category=writing";
    const state = parseTrackFilterState(new URLSearchParams(search));

    expect(toTrackFilterSearchParams(state).toString()).toBe(
      new URLSearchParams(search).toString(),
    );
  });

  it("omits empty facets so an unfiltered page has a bare URL", () => {
    expect(toTrackFilterSearchParams(EMPTY_TRACK_FILTER_STATE).toString()).toBe(
      "",
    );
  });
});

describe("applyTrackFilters", () => {
  const tracks = buildMixedTracks();
  const isEnabled = enabledExcept("prd");

  it("ORs values within a group", () => {
    const result = applyTrackFilters(
      tracks,
      isEnabled,
      stateWith({ categories: new Set(["environment", "writing"]) }),
    );
    expect(result.map((s) => s.name)).toEqual(["deno", "prd"]);
  });

  it("ANDs across groups", () => {
    const result = applyTrackFilters(
      tracks,
      isEnabled,
      stateWith({
        categories: new Set(["environment", "writing"]),
        states: new Set(["disabled"]),
      }),
    );
    expect(result.map((s) => s.name)).toEqual(["prd"]);
  });

  it("treats a category-less track as other", () => {
    const result = applyTrackFilters(
      tracks,
      isEnabled,
      stateWith({ categories: new Set(["other"]) }),
    );
    expect(result.map((s) => s.name)).toEqual(["house-rules"]);
  });

  it("matches the query against name, description, and triggers", () => {
    expect(
      applyTrackFilters(
        tracks,
        isEnabled,
        stateWith({ query: "Requirements" }),
      ).map((s) => s.name),
    ).toEqual(["prd"]);
    expect(
      applyTrackFilters(tracks, isEnabled, stateWith({ query: "deno" })).map(
        (s) => s.name,
      ),
    ).toEqual(["deno"]);
  });

  it("returns everything when no facet is selected", () => {
    expect(
      applyTrackFilters(tracks, isEnabled, EMPTY_TRACK_FILTER_STATE),
    ).toHaveLength(3);
  });
});

describe("buildTrackFacetGroups", () => {
  it("hides a group whose values cannot discriminate", () => {
    const publicOnly = [
      buildTrack({ name: "deno", category: "environment" }),
      buildTrack({ name: "uv", category: "environment" }),
    ];

    const groups = buildTrackFacetGroups(
      publicOnly,
      enabledExcept(),
      EMPTY_TRACK_FILTER_STATE,
    );

    // Every track is public, knowledge-typed, environment-categorised and
    // enabled, so no group has two non-empty values.
    expect(groups).toEqual([]);
  });

  it("keeps a group visible when its only selected value has no matches for this user", () => {
    // Reproduces sharing a `?source=project` URL with someone who has no project tracks: hiding the group would enforce the filter with no row left to undo it.
    const publicOnly = [
      buildTrack({ name: "deno", source: "public" }),
      buildTrack({ name: "uv", source: "public" }),
    ];

    const groups = buildTrackFacetGroups(
      publicOnly,
      enabledExcept(),
      stateWith({ sources: new Set(["project"]) }),
    );

    const source = groups.find((g) => g.id === "source");
    expect(source).toBeDefined();
    expect(source!.rows.find((r) => r.value === "project")).toMatchObject({
      checked: true,
      count: 0,
    });
  });

  it("shows groups once a second value exists", () => {
    const groups = buildTrackFacetGroups(
      buildMixedTracks(),
      enabledExcept("prd"),
      EMPTY_TRACK_FILTER_STATE,
    );

    expect(groups.map((g) => g.id)).toEqual([
      "state",
      "source",
      "category",
      "type",
    ]);
  });

  it("labels rows with i18n keys rather than translated text", () => {
    const groups = buildTrackFacetGroups(
      buildMixedTracks(),
      enabledExcept("prd"),
      EMPTY_TRACK_FILTER_STATE,
    );
    const category = groups.find((g) => g.id === "category")!;

    expect(category.labelKey).toBe(I18nKey.SETTINGS$TRACKS_FACET_CATEGORY);
    expect(category.rows.map((r) => r.value)).toEqual([
      "environment",
      "writing",
      "other",
    ]);
    expect(category.rows[0]!.labelKey).toBe(
      I18nKey.SETTINGS$TRACKS_CATEGORY_ENVIRONMENT,
    );
  });

  it("counts rows against other groups but not the group's own selection", () => {
    const groups = buildTrackFacetGroups(
      buildMixedTracks(),
      enabledExcept("prd"),
      stateWith({ states: new Set(["enabled"]) }),
    );

    const category = groups.find((g) => g.id === "category")!;
    const byValue = Object.fromEntries(
      category.rows.map((r) => [r.value, r.count]),
    );

    // The `state` selection narrows Category, dropping the disabled `prd`.
    expect(byValue).toEqual({ environment: 1, writing: 0, other: 1 });

    // The `state` group ignores its own selection, so both rows keep counts.
    const state = groups.find((g) => g.id === "state")!;
    expect(state.rows.map((r) => r.count)).toEqual([2, 1]);
  });

  it("keeps a different group's visibility stable while one facet narrows", () => {
    const tracks = buildMixedTracks();
    const isEnabled = enabledExcept("prd");

    const narrowed = buildTrackFacetGroups(
      tracks,
      isEnabled,
      stateWith({ categories: new Set(["environment"]) }),
    );

    // Only `deno` survives, leaving Source and Type one value each among the matches; visibility comes from the raw list, so both groups still render.
    expect(narrowed.map((g) => g.id)).toEqual(
      expect.arrayContaining(["source", "type"]),
    );
  });

  it("keeps group visibility stable while a search query narrows results", () => {
    const tracks = buildMixedTracks();
    const isEnabled = enabledExcept("prd");
    const unfiltered = buildTrackFacetGroups(
      tracks,
      isEnabled,
      EMPTY_TRACK_FILTER_STATE,
    );

    // "Requirements" matches only `prd`, so a query-filtered denominator would collapse every group to one value.
    const narrowed = buildTrackFacetGroups(
      tracks,
      isEnabled,
      stateWith({ query: "Requirements" }),
    );

    expect(narrowed.map((g) => g.id)).toEqual(unfiltered.map((g) => g.id));
  });

  it("adds a recommendation group once the catalog flags one of the tracks", () => {
    // `add-track` carries `defaultEnabled` in the bundled catalog; `deno` does
    // not, which is what gives the group two discriminating values.
    const groups = buildTrackFacetGroups(
      [buildTrack({ name: "add-track" }), buildTrack({ name: "deno" })],
      enabledExcept(),
      EMPTY_TRACK_FILTER_STATE,
    );

    const recommendation = groups.find((g) => g.id === "recommendation")!;
    expect(recommendation.labelKey).toBe(
      I18nKey.SETTINGS$TRACKS_FACET_RECOMMENDATION,
    );
    expect(recommendation.rows.map((r) => [r.value, r.count])).toEqual([
      ["recommended", 1],
      ["other", 1],
    ]);
  });

  it("filters down to the catalog's recommended tracks", () => {
    const tracks = [
      buildTrack({ name: "add-track" }),
      buildTrack({ name: "deno" }),
    ];

    expect(
      applyTrackFilters(
        tracks,
        enabledExcept(),
        stateWith({ recommendations: new Set(["recommended"]) }),
      ).map((s) => s.name),
    ).toEqual(["add-track"]);
  });

  it("disables a zero-count row unless it is checked", () => {
    const groups = buildTrackFacetGroups(
      buildMixedTracks(),
      enabledExcept("prd"),
      stateWith({ states: new Set(["enabled"]) }),
    );
    const rows = groups.find((g) => g.id === "category")!.rows;

    expect(rows.find((r) => r.value === "writing")).toMatchObject({
      count: 0,
      checked: false,
      disabled: true,
    });
  });
});

describe("toggleTrackFilterValue", () => {
  it("adds then removes a value without mutating the input", () => {
    const initial = EMPTY_TRACK_FILTER_STATE;
    const added = toggleTrackFilterValue(initial, "category", "writing");
    const removed = toggleTrackFilterValue(added, "category", "writing");

    expect([...added.categories]).toEqual(["writing"]);
    expect([...removed.categories]).toEqual([]);
    expect([...initial.categories]).toEqual([]);
  });

  it("ignores a value that is not legal for the group", () => {
    const next = toggleTrackFilterValue(
      EMPTY_TRACK_FILTER_STATE,
      "type",
      "nonsense",
    );
    expect(countActiveFilters(next)).toBe(0);
  });

  it.each([
    ["source", "sources", "project"],
    ["state", "states", "disabled"],
  ] as const)(
    "toggles a %s value into its own set, leaving the rest empty",
    (groupId, key, value) => {
      const next = toggleTrackFilterValue(
        EMPTY_TRACK_FILTER_STATE,
        groupId,
        value,
      );

      // Catches a branch writing to the wrong field: either the intended set stays empty, or an unintended one gains the value.
      const collections = ["sources", "categories", "types", "states"] as const;
      for (const collection of collections) {
        const expected = collection === key ? [value] : [];
        expect([...next[collection]]).toEqual(expected);
      }
    },
  );
});

describe("clearTrackFilterFacets and countActiveFilters", () => {
  it("clears facets but keeps the query", () => {
    const state = stateWith({
      query: "deno",
      categories: new Set(["writing"]),
      types: new Set(["repo"]),
    });

    const cleared = clearTrackFilterFacets(state);

    expect(cleared.query).toBe("deno");
    expect(countActiveFilters(cleared)).toBe(0);
  });

  it("does not count the query as a filter", () => {
    expect(countActiveFilters(stateWith({ query: "deno" }))).toBe(0);
    expect(
      countActiveFilters(
        stateWith({ query: "deno", categories: new Set(["writing"]) }),
      ),
    ).toBe(1);
  });
});
