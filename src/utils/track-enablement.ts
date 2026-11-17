import {
  DEFAULT_ENABLED_TRACK_NAMES,
  TRACKS_CATALOG,
} from "@handprint-ai/extensions/tracks";

/** Every track bundled from `@handprint-ai/extensions`, in catalog order. */
export const CATALOG_TRACK_NAMES: readonly string[] = TRACKS_CATALOG.map(
  (entry) => entry.name,
);

const CATALOG_TRACK_NAME_SET = new Set(CATALOG_TRACK_NAMES);
const RECOMMENDED_TRACK_NAME_SET = new Set(DEFAULT_ENABLED_TRACK_NAMES);

export function isCatalogTrack(name: string): boolean {
  return CATALOG_TRACK_NAME_SET.has(name);
}

export function isRecommendedTrack(name: string): boolean {
  return RECOMMENDED_TRACK_NAME_SET.has(name);
}

/**
 * The two persisted lists. They cover different populations: `enabledTracks`
 * allow-lists the bundled catalog, whose every future addition would otherwise
 * be on for everyone (#16302), while `disabledTracks` keeps denying user- and
 * project-authored tracks, which should be on the moment they appear.
 *
 * `undefined` means "never migrated" and must survive settings hydration.
 */
export interface TrackEnablement {
  enabledTracks?: string[];
  disabledTracks?: string[];
}

export function resolveEnabledCatalogTracks(
  enablement: TrackEnablement,
): string[] {
  return enablement.enabledTracks ?? [...DEFAULT_ENABLED_TRACK_NAMES];
}

/**
 * The one rule for "will this track be loaded", resolved once per caller so
 * per-track checks stay cheap.
 *
 * The deny-list still wins over the allow-list, which only matters before the
 * migration runs: until then a pre-existing "I turned this off" lives in the
 * deny-list alone.
 */
export function buildTrackEnablementFilter(
  enablement: TrackEnablement,
): (trackName: string) => boolean {
  const enabled = new Set(resolveEnabledCatalogTracks(enablement));
  const disabled = new Set(enablement.disabledTracks ?? []);

  return (trackName) => {
    if (disabled.has(trackName)) return false;
    return !isCatalogTrack(trackName) || enabled.has(trackName);
  };
}

/**
 * One-shot conversion from "all catalog tracks on, minus a deny-list" to an
 * explicit allow-list; `undefined` once already migrated.
 *
 * A fresh workspace is migrated too, even though the resolver's fallback would
 * give it the same set: persisting an explicit list is what stops a later
 * `defaultEnabled` catalog addition from switching itself on.
 */
export function migrateTrackEnablement(
  enablement: TrackEnablement,
): { enabled_tracks: string[]; disabled_tracks: string[] } | undefined {
  if (enablement.enabledTracks !== undefined) return undefined;

  const disabled = new Set(enablement.disabledTracks ?? []);
  // A deny-list naming a catalog track is the only evidence that this
  // workspace predates the allow-list; one holding local names alone says
  // nothing about the catalog.
  const isExistingWorkspace = [...disabled].some(isCatalogTrack);

  return {
    enabled_tracks: isExistingWorkspace
      ? CATALOG_TRACK_NAMES.filter((name) => !disabled.has(name))
      : [...DEFAULT_ENABLED_TRACK_NAMES],
    // Catalog names move to the allow-list; a leftover deny entry would veto
    // a track the user later switches back on.
    disabled_tracks: [...disabled].filter((name) => !isCatalogTrack(name)),
  };
}

export function toTrackEnablement(settings: {
  enabled_tracks?: string[];
  disabled_tracks?: string[];
}): TrackEnablement {
  return {
    enabledTracks: settings.enabled_tracks,
    disabledTracks: settings.disabled_tracks,
  };
}

// Both forms a user can send: the commands a track declares in its own
// `triggers` (what an automation card fills in — see `findAutomationCommand`),
// and `/<track-name>`, which the detail modal's "Use track" button inserts.
const CATALOG_TRACK_BY_SLASH_COMMAND = new Map(
  TRACKS_CATALOG.flatMap((entry) =>
    [
      `/${entry.name}`,
      ...(entry.triggers ?? []).filter((trigger) => trigger.startsWith("/")),
    ].map((command) => [command.toLowerCase(), entry.name] as const),
  ),
);

/**
 * The catalog track a message invokes by name, if any.
 *
 * 18 of the catalog's 24 slash commands belong to tracks that are off by
 * default, so without this an automation card would send its command with none
 * of the instructions behind it. Only the leading token counts: matching a
 * `/word` anywhere in prose would re-admit most of the catalog.
 */
export function findInvokedCatalogTrack(query?: string): string | undefined {
  const firstToken = query?.trim().split(/\s+/, 1)[0];
  if (!firstToken?.startsWith("/")) return undefined;
  return CATALOG_TRACK_BY_SLASH_COMMAND.get(firstToken.toLowerCase());
}
