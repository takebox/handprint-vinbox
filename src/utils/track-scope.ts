import type { TrackInfo } from "#/types/settings";

export type TrackScope = "project" | "personal" | "public";

export const TRACK_SCOPE_ORDER: TrackScope[] = [
  "project",
  "personal",
  "public",
];

// `.handprint/microagents/` is the pre-rename tracks directory. The SDK still
// loads tracks from it for backward compatibility, so it keeps reporting those
// paths as a track's `source` — this marker is what maps them to a scope.
// Dropping it would silently misfile legacy tracks as "public".
const USER_TRACK_DIR_MARKERS = [
  "/.agents/tracks/",
  "/.handprint/tracks/",
  "/.handprint/microagents/",
] as const;

function normalizePath(path: string): string {
  return path.replace(/\\/g, "/");
}

function isPublicSource(source: string): boolean {
  const norm = normalizePath(source).toLowerCase();
  if (norm === "public") {
    return true;
  }
  return (
    norm.includes("public-tracks") || norm.includes("/.handprint/cache/tracks/")
  );
}

function isUserHomeTrackPath(source: string): boolean {
  const norm = normalizePath(source);
  if (/^\/Users\/[^/]+\/\.(agents|handprint)\//.test(norm)) {
    return true;
  }
  if (/^\/home\/[^/]+\/\.(agents|handprint)\//.test(norm)) {
    return true;
  }

  return USER_TRACK_DIR_MARKERS.some((marker) => {
    const markerIndex = norm.indexOf(marker);
    if (markerIndex === -1) {
      return false;
    }
    const prefix = norm.slice(0, markerIndex);
    return /^\/Users\/[^/]+$/.test(prefix) || /^\/home\/[^/]+$/.test(prefix);
  });
}

function isProjectTrackPath(
  source: string,
  projectDir?: string | null,
): boolean {
  const norm = normalizePath(source);
  const hasProjectMarker = USER_TRACK_DIR_MARKERS.some((marker) =>
    norm.includes(marker),
  );
  if (!hasProjectMarker) {
    return false;
  }
  if (isUserHomeTrackPath(source)) {
    return false;
  }

  if (projectDir) {
    const projectNorm = normalizePath(projectDir).replace(/\/$/, "");
    if (norm.startsWith(projectNorm)) {
      return true;
    }
  }

  return true;
}

export function getTrackScope(
  track: TrackInfo,
  projectDir?: string | null,
): TrackScope {
  const source = track.source?.trim();
  if (!source) {
    return track.type === "repo" ? "project" : "public";
  }

  const lower = source.toLowerCase();
  if (isPublicSource(source)) {
    return "public";
  }
  if (lower === "user" || lower === "global") {
    return "personal";
  }
  if (lower === "project" || lower === "repo" || lower === "sandbox") {
    return "project";
  }
  if (isUserHomeTrackPath(source)) {
    return "personal";
  }
  if (isProjectTrackPath(source, projectDir)) {
    return "project";
  }

  return "public";
}

export function groupTracksByScope(
  tracks: TrackInfo[],
  projectDir?: string | null,
): Record<TrackScope, TrackInfo[]> {
  const groups: Record<TrackScope, TrackInfo[]> = {
    project: [],
    personal: [],
    public: [],
  };

  for (const track of tracks) {
    groups[getTrackScope(track, projectDir)].push(track);
  }

  for (const scope of TRACK_SCOPE_ORDER) {
    groups[scope].sort((left, right) => left.name.localeCompare(right.name));
  }

  return groups;
}
