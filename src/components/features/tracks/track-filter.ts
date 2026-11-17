import type { TrackCategoryId } from "@handprint-ai/extensions/tracks";
import { I18nKey } from "#/i18n/declaration";
import type { TrackInfo, TrackType } from "#/types/settings";
import {
  getTrackCategory,
  TRACK_CATEGORY_LABEL_KEYS,
  TRACK_CATEGORY_ORDER,
} from "#/utils/track-category";
import {
  getTrackScope,
  TRACK_SCOPE_ORDER,
  type TrackScope,
} from "#/utils/track-scope";
import { isRecommendedTrack } from "#/utils/track-enablement";
import { getTrackCardDescription } from "./get-track-card-description";

export const TRACK_FILTER_QUERY_PARAM = "q";
const SOURCE_PARAM = "source";
const CATEGORY_PARAM = "category";
const TYPE_PARAM = "type";
const STATE_PARAM = "state";
const RECOMMENDATION_PARAM = "recommendation";

export type TrackEnabledState = "enabled" | "disabled";
export type TrackRecommendation = "recommended" | "other";
export type TrackFacetGroupId =
  | "state"
  | "recommendation"
  | "source"
  | "category"
  | "type";

const TRACK_ENABLED_STATE_ORDER: readonly TrackEnabledState[] = [
  "enabled",
  "disabled",
];
const TRACK_RECOMMENDATION_ORDER: readonly TrackRecommendation[] = [
  "recommended",
  "other",
];
const TRACK_TYPE_ORDER: readonly TrackType[] = [
  "agenttracks",
  "knowledge",
  "repo",
];

export interface TrackFilterState {
  query: string;
  sources: Set<TrackScope>;
  categories: Set<TrackCategoryId>;
  types: Set<TrackType>;
  states: Set<TrackEnabledState>;
  recommendations: Set<TrackRecommendation>;
}

export interface TrackFacetRowModel {
  value: string;
  labelKey: I18nKey;
  count: number;
  checked: boolean;
  disabled: boolean;
}

export interface TrackFacetGroup {
  id: TrackFacetGroupId;
  labelKey: I18nKey;
  rows: TrackFacetRowModel[];
}

export const EMPTY_TRACK_FILTER_STATE: TrackFilterState = {
  query: "",
  sources: new Set(),
  categories: new Set(),
  types: new Set(),
  states: new Set(),
  recommendations: new Set(),
};

/** Carrying `labelKey`s rather than translated strings keeps this module pure, so its tests need no i18n. */
interface GroupValue {
  value: string;
  labelKey: I18nKey;
}

function labelledValues<TValue extends string>(
  order: readonly TValue[],
  labelKeys: Record<TValue, I18nKey>,
): readonly GroupValue[] {
  return order.map((value) => ({ value, labelKey: labelKeys[value] }));
}

/** Resolving the two lists behind enablement is the caller's job, not this module's. */
type TrackEnabledPredicate = (track: TrackInfo) => boolean;

/** A new facet group is declared here and nowhere else: `selected` / `withSelected` are what keep every operation below driven by this table alone. */
interface GroupDef {
  id: TrackFacetGroupId;
  labelKey: I18nKey;
  param: string;
  values: readonly GroupValue[];
  valueOf: (track: TrackInfo, isEnabled: TrackEnabledPredicate) => string;
  selected: (state: TrackFilterState) => Set<string>;
  withSelected: (
    state: TrackFilterState,
    next: Set<string>,
  ) => TrackFilterState;
}

/** Rebuilding rather than casting keeps every writer below cast-free: a value the group does not declare cannot survive. */
function narrowSet<TValue extends string>(
  order: readonly TValue[],
  next: Set<string>,
): Set<TValue> {
  return new Set(order.filter((value) => next.has(value)));
}

const SOURCE_LABEL_KEYS: Record<TrackScope, I18nKey> = {
  project: I18nKey.SETTINGS$TRACKS_SOURCE_PROJECT,
  personal: I18nKey.SETTINGS$TRACKS_SOURCE_PERSONAL,
  public: I18nKey.SETTINGS$TRACKS_SOURCE_PUBLIC,
};

const TYPE_LABEL_KEYS: Record<TrackType, I18nKey> = {
  agenttracks: I18nKey.SETTINGS$TRACKS_TYPE_AGENTTRACKS,
  knowledge: I18nKey.SETTINGS$TRACKS_TYPE_KNOWLEDGE,
  repo: I18nKey.SETTINGS$TRACKS_TYPE_REPO,
};

const STATE_LABEL_KEYS: Record<TrackEnabledState, I18nKey> = {
  enabled: I18nKey.SETTINGS$TRACKS_ENABLED,
  disabled: I18nKey.SETTINGS$TRACKS_DISABLED,
};

const RECOMMENDATION_LABEL_KEYS: Record<TrackRecommendation, I18nKey> = {
  recommended: I18nKey.SETTINGS$TRACKS_RECOMMENDED,
  other: I18nKey.SETTINGS$TRACKS_RECOMMENDATION_OTHER,
};

const GROUP_DEFS: readonly GroupDef[] = [
  {
    id: "state",
    labelKey: I18nKey.SETTINGS$TRACKS_FACET_STATE,
    param: STATE_PARAM,
    values: labelledValues(TRACK_ENABLED_STATE_ORDER, STATE_LABEL_KEYS),
    valueOf: (track, isEnabled) => (isEnabled(track) ? "enabled" : "disabled"),
    selected: (state) => state.states,
    withSelected: (state, next) => ({
      ...state,
      states: narrowSet(TRACK_ENABLED_STATE_ORDER, next),
    }),
  },
  {
    id: "recommendation",
    labelKey: I18nKey.SETTINGS$TRACKS_FACET_RECOMMENDATION,
    param: RECOMMENDATION_PARAM,
    values: labelledValues(
      TRACK_RECOMMENDATION_ORDER,
      RECOMMENDATION_LABEL_KEYS,
    ),
    valueOf: (track) =>
      isRecommendedTrack(track.name) ? "recommended" : "other",
    selected: (state) => state.recommendations,
    withSelected: (state, next) => ({
      ...state,
      recommendations: narrowSet(TRACK_RECOMMENDATION_ORDER, next),
    }),
  },
  {
    id: "source",
    labelKey: I18nKey.SETTINGS$TRACKS_FACET_SOURCE,
    param: SOURCE_PARAM,
    values: labelledValues(TRACK_SCOPE_ORDER, SOURCE_LABEL_KEYS),
    valueOf: (track) => getTrackScope(track),
    selected: (state) => state.sources,
    withSelected: (state, next) => ({
      ...state,
      sources: narrowSet(TRACK_SCOPE_ORDER, next),
    }),
  },
  {
    id: "category",
    labelKey: I18nKey.SETTINGS$TRACKS_FACET_CATEGORY,
    param: CATEGORY_PARAM,
    values: labelledValues(TRACK_CATEGORY_ORDER, TRACK_CATEGORY_LABEL_KEYS),
    valueOf: (track) => getTrackCategory(track),
    selected: (state) => state.categories,
    withSelected: (state, next) => ({
      ...state,
      categories: narrowSet(TRACK_CATEGORY_ORDER, next),
    }),
  },
  {
    id: "type",
    labelKey: I18nKey.SETTINGS$TRACKS_FACET_TYPE,
    param: TYPE_PARAM,
    values: labelledValues(TRACK_TYPE_ORDER, TYPE_LABEL_KEYS),
    valueOf: (track) => track.type,
    selected: (state) => state.types,
    withSelected: (state, next) => ({
      ...state,
      types: narrowSet(TRACK_TYPE_ORDER, next),
    }),
  },
];

function groupDef(id: TrackFacetGroupId): GroupDef {
  const def = GROUP_DEFS.find((candidate) => candidate.id === id);
  if (!def) throw new Error(`Unknown track facet group: ${id}`);
  return def;
}

/** Unknown values are dropped, so a hand-edited URL cannot smuggle one in. */
function parseSet(raw: string[], def: GroupDef): Set<string> {
  const legal = new Set(def.values.map(({ value }) => value));
  return new Set(
    raw.map((value) => value.trim()).filter((value) => legal.has(value)),
  );
}

export function parseTrackFilterState(
  params: URLSearchParams,
): TrackFilterState {
  return GROUP_DEFS.reduce<TrackFilterState>(
    (state, def) =>
      def.withSelected(state, parseSet(params.getAll(def.param), def)),
    {
      ...EMPTY_TRACK_FILTER_STATE,
      query: params.get(TRACK_FILTER_QUERY_PARAM) ?? "",
    },
  );
}

export function toTrackFilterSearchParams(
  state: TrackFilterState,
): URLSearchParams {
  const params = new URLSearchParams();
  if (state.query) params.set(TRACK_FILTER_QUERY_PARAM, state.query);

  // Canonical order keeps URLs deterministic regardless of click order.
  for (const def of GROUP_DEFS) {
    const selected = def.selected(state);
    for (const { value } of def.values) {
      if (selected.has(value)) params.append(def.param, value);
    }
  }

  return params;
}

function matchesQuery(track: TrackInfo, query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const haystacks = [
    track.name,
    getTrackCardDescription(track),
    track.description ?? "",
    track.content ?? "",
    track.license ?? "",
    track.compatibility ?? "",
    ...(track.triggers ?? []),
    ...(track.allowed_tools ?? []),
  ];

  const lowered = trimmed.toLowerCase();
  return haystacks.some((value) => value.toLowerCase().includes(lowered));
}

/**
 * `exclude` omits one group's own selection so its rows stay counted against the other groups alone.
 * A row therefore reads "this many tracks carry this value, under your other filters" — the usual disjunctive facet count — and not "your result set will be this big": the group ORs its values together, so on a group that already has a selection the two differ.
 */
function matchesFacets(
  track: TrackInfo,
  isEnabled: TrackEnabledPredicate,
  state: TrackFilterState,
  exclude?: TrackFacetGroupId,
): boolean {
  return GROUP_DEFS.every((def) => {
    if (def.id === exclude) return true;
    const selected = def.selected(state);
    if (selected.size === 0) return true;
    return selected.has(def.valueOf(track, isEnabled));
  });
}

export function applyTrackFilters(
  tracks: TrackInfo[],
  isEnabled: TrackEnabledPredicate,
  state: TrackFilterState,
): TrackInfo[] {
  return tracks.filter(
    (track) =>
      matchesQuery(track, state.query) &&
      matchesFacets(track, isEnabled, state),
  );
}

function countByValue(
  tracks: TrackInfo[],
  def: GroupDef,
  isEnabled: TrackEnabledPredicate,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const track of tracks) {
    const value = def.valueOf(track, isEnabled);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function buildGroup(
  def: GroupDef,
  allTracks: TrackInfo[],
  searched: TrackInfo[],
  isEnabled: TrackEnabledPredicate,
  state: TrackFilterState,
): TrackFacetGroup | null {
  // Visibility and the row set come from the raw list so the rail's shape
  // depends only on what the user has, never on the active filters. If they
  // tracked filtered counts, narrowing could make a group vanish mid-click.
  const rawCounts = countByValue(allTracks, def, isEnabled);
  const discriminating = def.values.filter(
    ({ value }) => (rawCounts[value] ?? 0) > 0,
  );
  const selected = def.selected(state);
  // A group with only one (or zero) discriminating values is normally hidden,
  // but a selection can still be carried in from the URL for a value that has
  // no matches for this user. Hiding the group then would enforce the filter
  // invisibly, with no row left to explain or undo it.
  if (discriminating.length < 2 && selected.size === 0) return null;

  const visibleValues = def.values.filter(
    ({ value }) => (rawCounts[value] ?? 0) > 0 || selected.has(value),
  );

  const candidates = searched.filter((track) =>
    matchesFacets(track, isEnabled, state, def.id),
  );
  const counts = countByValue(candidates, def, isEnabled);

  return {
    id: def.id,
    labelKey: def.labelKey,
    rows: visibleValues.map(({ value, labelKey }) => {
      const count = counts[value] ?? 0;
      const checked = selected.has(value);
      return {
        value,
        labelKey,
        count,
        checked,
        disabled: count === 0 && !checked,
      };
    }),
  };
}

export function buildTrackFacetGroups(
  tracks: TrackInfo[],
  isEnabled: TrackEnabledPredicate,
  state: TrackFilterState,
): TrackFacetGroup[] {
  const searched = tracks.filter((track) => matchesQuery(track, state.query));

  return GROUP_DEFS.map((def) =>
    buildGroup(def, tracks, searched, isEnabled, state),
  ).filter((group): group is TrackFacetGroup => group !== null);
}

export function toggleTrackFilterValue(
  state: TrackFilterState,
  groupId: TrackFacetGroupId,
  value: string,
): TrackFilterState {
  const def = groupDef(groupId);
  // `withSelected` would drop an unknown value anyway; returning the same
  // state object keeps a no-op toggle from re-rendering or rewriting the URL.
  if (!def.values.some((candidate) => candidate.value === value)) return state;

  const next = new Set(def.selected(state));
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }

  return def.withSelected(state, next);
}

export function clearTrackFilterFacets(
  state: TrackFilterState,
): TrackFilterState {
  return { ...EMPTY_TRACK_FILTER_STATE, query: state.query };
}

export function countActiveFilters(state: TrackFilterState): number {
  // The query is excluded: it is already visible in its own input, so counting
  // it would double-report in both the Filters badge and the summary row.
  return GROUP_DEFS.reduce((total, def) => total + def.selected(state).size, 0);
}
