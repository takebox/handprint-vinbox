import type { Automation } from "#/types/automation";
import type { TrackInfo } from "#/types/settings";
import {
  getTrackScope,
  TRACK_SCOPE_ORDER,
  type TrackScope,
} from "#/utils/track-scope";

export const CONVERSATION_OVERVIEW_PROJECT_SCOPE = {
  project: "project",
  all: "all",
} as const;

export type ConversationOverviewProjectScope =
  (typeof CONVERSATION_OVERVIEW_PROJECT_SCOPE)[keyof typeof CONVERSATION_OVERVIEW_PROJECT_SCOPE];

export function normalizeRepositoryName(
  repository: string | null | undefined,
): string | null {
  if (!repository?.trim()) {
    return null;
  }
  return repository
    .trim()
    .toLowerCase()
    .replace(/\.git$/, "");
}

export function isAutomationForRepository(
  automation: Pick<Automation, "repository">,
  repository: string | null | undefined,
): boolean {
  const target = normalizeRepositoryName(repository);
  const automationRepo = normalizeRepositoryName(automation.repository);
  if (!target || !automationRepo) {
    return false;
  }
  return automationRepo === target;
}

export function isTrackForProject(
  track: TrackInfo,
  projectDir?: string | null,
): boolean {
  return getTrackScope(track, projectDir) === "project";
}

export function filterAutomationsByProjectScope(
  automations: Automation[],
  scope: ConversationOverviewProjectScope,
  repository: string | null | undefined,
): Automation[] {
  if (scope === CONVERSATION_OVERVIEW_PROJECT_SCOPE.all) {
    return automations;
  }
  return automations.filter((automation) =>
    isAutomationForRepository(automation, repository),
  );
}

export function filterTracksByProjectScope(
  tracks: TrackInfo[],
  scope: ConversationOverviewProjectScope,
  projectDir?: string | null,
): TrackInfo[] {
  if (scope === CONVERSATION_OVERVIEW_PROJECT_SCOPE.all) {
    return tracks;
  }
  return tracks.filter((track) => isTrackForProject(track, projectDir));
}

export function sortAutomationsByProjectRelevance(
  automations: Automation[],
  repository: string | null | undefined,
): Automation[] {
  return [...automations].sort((left, right) => {
    const leftMatch = isAutomationForRepository(left, repository) ? 0 : 1;
    const rightMatch = isAutomationForRepository(right, repository) ? 0 : 1;
    if (leftMatch !== rightMatch) {
      return leftMatch - rightMatch;
    }
    return left.name.localeCompare(right.name);
  });
}

export function sortTracksByProjectRelevance(
  tracks: TrackInfo[],
  projectDir?: string | null,
): TrackInfo[] {
  return [...tracks].sort((left, right) => {
    const leftScope = getTrackScope(left, projectDir);
    const rightScope = getTrackScope(right, projectDir);
    const leftOrder = TRACK_SCOPE_ORDER.indexOf(leftScope as TrackScope);
    const rightOrder = TRACK_SCOPE_ORDER.indexOf(rightScope as TrackScope);
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return left.name.localeCompare(right.name);
  });
}

export function countAutomationsForRepository(
  automations: readonly Automation[],
  repository: string | null | undefined,
): number {
  return automations.filter((automation) =>
    isAutomationForRepository(automation, repository),
  ).length;
}

export function countTracksForProject(
  tracks: readonly TrackInfo[],
  projectDir?: string | null,
): number {
  return tracks.filter((track) => isTrackForProject(track, projectDir)).length;
}
