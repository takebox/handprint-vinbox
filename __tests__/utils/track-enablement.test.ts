import { describe, expect, it } from "vitest";
import {
  DEFAULT_ENABLED_TRACK_NAMES,
  TRACKS_CATALOG,
} from "@handprint-ai/extensions/tracks";
import {
  buildTrackEnablementFilter,
  findInvokedCatalogTrack,
  isCatalogTrack,
  isRecommendedTrack,
  migrateTrackEnablement,
  resolveEnabledCatalogTracks,
  toTrackEnablement,
} from "#/utils/track-enablement";

// Two anchors from the bundled catalog: `add-track` carries `defaultEnabled`,
// `add-javadoc` is the language-specific kind of track Handprint#16302 asked
// not to be opted into.
const RECOMMENDED = "add-track";
const OPTIONAL = "add-javadoc";
const LOCAL = "house-rules";

describe("catalog membership", () => {
  it("recognises bundled tracks and ignores locally authored ones", () => {
    expect(isCatalogTrack(RECOMMENDED)).toBe(true);
    expect(isCatalogTrack(OPTIONAL)).toBe(true);
    expect(isCatalogTrack(LOCAL)).toBe(false);
  });

  it("marks only the catalog's default-enabled entries as recommended", () => {
    expect(isRecommendedTrack(RECOMMENDED)).toBe(true);
    expect(isRecommendedTrack(OPTIONAL)).toBe(false);
    expect(DEFAULT_ENABLED_TRACK_NAMES.length).toBeLessThan(
      TRACKS_CATALOG.length,
    );
  });
});

describe("resolveEnabledCatalogTracks", () => {
  it("falls back to the curated default when nothing is persisted", () => {
    expect(resolveEnabledCatalogTracks({})).toEqual([
      ...DEFAULT_ENABLED_TRACK_NAMES,
    ]);
  });

  it("uses the persisted allow-list verbatim, empty list included", () => {
    expect(resolveEnabledCatalogTracks({ enabledTracks: [OPTIONAL] })).toEqual([
      OPTIONAL,
    ]);
    expect(resolveEnabledCatalogTracks({ enabledTracks: [] })).toEqual([]);
  });
});

describe("buildTrackEnablementFilter", () => {
  it("keeps user- and project-authored tracks on unless denied", () => {
    expect(buildTrackEnablementFilter({ enabledTracks: [] })(LOCAL)).toBe(true);
    expect(buildTrackEnablementFilter({ disabledTracks: [LOCAL] })(LOCAL)).toBe(
      false,
    );
  });

  it("requires a catalog track to be on the allow-list", () => {
    expect(buildTrackEnablementFilter({})(OPTIONAL)).toBe(false);
    expect(buildTrackEnablementFilter({})(RECOMMENDED)).toBe(true);
    expect(
      buildTrackEnablementFilter({ enabledTracks: [OPTIONAL] })(OPTIONAL),
    ).toBe(true);
  });

  it("lets an unmigrated deny-list veto a default-enabled track", () => {
    // Until the migration runs, an existing "I turned this off" lives in the
    // deny-list alone; the allow-list fallback must not switch it back on.
    expect(
      buildTrackEnablementFilter({ disabledTracks: [RECOMMENDED] })(
        RECOMMENDED,
      ),
    ).toBe(false);
  });
});

describe("migrateTrackEnablement", () => {
  it("does nothing once an allow-list is persisted", () => {
    expect(migrateTrackEnablement({ enabledTracks: [] })).toBeUndefined();
    expect(
      migrateTrackEnablement({ enabledTracks: [RECOMMENDED] }),
    ).toBeUndefined();
  });

  it("preserves an existing workspace's all-on-minus-deny-list set", () => {
    const migrated = migrateTrackEnablement({ disabledTracks: [OPTIONAL] });

    expect(migrated?.enabled_tracks).toHaveLength(TRACKS_CATALOG.length - 1);
    expect(migrated?.enabled_tracks).not.toContain(OPTIONAL);
    expect(migrated?.enabled_tracks).toContain(RECOMMENDED);
    // The catalog name has moved to the allow-list; a leftover deny entry
    // would veto the track if the user switched it back on later.
    expect(migrated?.disabled_tracks).toEqual([]);
  });

  it("keeps local deny entries, which the allow-list does not cover", () => {
    const migrated = migrateTrackEnablement({
      disabledTracks: [OPTIONAL, LOCAL],
    });

    expect(migrated?.disabled_tracks).toEqual([LOCAL]);
  });

  it("gives a fresh workspace the curated default", () => {
    expect(migrateTrackEnablement({})?.enabled_tracks).toEqual([
      ...DEFAULT_ENABLED_TRACK_NAMES,
    ]);
    // A deny-list naming only local tracks says nothing about the catalog.
    expect(
      migrateTrackEnablement({ disabledTracks: [LOCAL] })?.enabled_tracks,
    ).toEqual([...DEFAULT_ENABLED_TRACK_NAMES]);
  });

  it("persists the set even for a fresh workspace", () => {
    // Without an explicit write, a catalog addition marked `defaultEnabled`
    // would switch itself on in a workspace that never asked for it.
    expect(migrateTrackEnablement({})).toBeDefined();
  });
});

describe("toTrackEnablement", () => {
  it("keeps an absent allow-list undefined, the unmigrated sentinel", () => {
    expect(toTrackEnablement({ disabled_tracks: [LOCAL] })).toEqual({
      enabledTracks: undefined,
      disabledTracks: [LOCAL],
    });
  });
});

describe("findInvokedCatalogTrack", () => {
  it("resolves a track's own slash command, which is what automation cards send", () => {
    expect(findInvokedCatalogTrack("/standup-digest:setup")).toBe(
      "slack-standup-digest",
    );
    expect(findInvokedCatalogTrack("/codereview please look at src/")).toBe(
      "code-review",
    );
  });

  it("resolves `/<track-name>`, which the Use track button inserts", () => {
    expect(findInvokedCatalogTrack(`/${OPTIONAL} MyClass.java`)).toBe(OPTIONAL);
  });

  it("only counts the leading token", () => {
    // Matching a `/word` anywhere in prose would re-admit most of the catalog.
    expect(
      findInvokedCatalogTrack("what would /standup-digest:setup do?"),
    ).toBeUndefined();
  });

  it("ignores an empty, absent, or unknown command", () => {
    expect(findInvokedCatalogTrack(undefined)).toBeUndefined();
    expect(findInvokedCatalogTrack("   ")).toBeUndefined();
    expect(findInvokedCatalogTrack("just a message")).toBeUndefined();
    expect(findInvokedCatalogTrack("/not-a-real-track")).toBeUndefined();
  });
});
