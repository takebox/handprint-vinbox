import { describe, expect, it } from "vitest";
import type { Automation } from "#/types/automation";
import type { TrackInfo } from "#/types/settings";
import {
  CONVERSATION_OVERVIEW_PROJECT_SCOPE,
  countAutomationsForRepository,
  countTracksForProject,
  filterAutomationsByProjectScope,
  filterTracksByProjectScope,
  isAutomationForRepository,
  sortAutomationsByProjectRelevance,
  sortTracksByProjectRelevance,
} from "#/utils/conversation-overview-project-scope";

function buildAutomation(
  overrides: Partial<Automation> & Pick<Automation, "id" | "name">,
): Automation {
  return {
    trigger: { type: "cron", schedule: "0 * * * *" },
    enabled: true,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    prompt: null,
    ...overrides,
  };
}

function buildTrack(
  overrides: Partial<TrackInfo> & Pick<TrackInfo, "name">,
): TrackInfo {
  return {
    type: "knowledge",
    source: "public",
    description: null,
    triggers: [],
    license: null,
    compatibility: null,
    metadata: null,
    allowed_tools: null,
    is_agenttracks_format: true,
    disable_model_invocation: false,
    ...overrides,
  };
}

describe("conversation overview project scope", () => {
  it("matches automations to the open repository case-insensitively", () => {
    expect(
      isAutomationForRepository(
        buildAutomation({
          id: "1",
          name: "A",
          repository: "Handprint/Agent-Vinbox.git",
        }),
        "handprint/agent-vinbox",
      ),
    ).toBe(true);
    expect(
      isAutomationForRepository(
        buildAutomation({ id: "2", name: "B", repository: "other/repo" }),
        "handprint/agent-vinbox",
      ),
    ).toBe(false);
    expect(
      isAutomationForRepository(
        buildAutomation({ id: "3", name: "C" }),
        "handprint/agent-vinbox",
      ),
    ).toBe(false);
  });

  it("filters and sorts automations for project vs all scopes", () => {
    const automations = [
      buildAutomation({ id: "1", name: "Zeta", repository: "other/repo" }),
      buildAutomation({
        id: "2",
        name: "Alpha",
        repository: "handprint/agent-vinbox",
      }),
      buildAutomation({
        id: "3",
        name: "Beta",
        repository: "handprint/agent-vinbox",
      }),
    ];

    expect(
      filterAutomationsByProjectScope(
        automations,
        CONVERSATION_OVERVIEW_PROJECT_SCOPE.project,
        "handprint/agent-vinbox",
      ).map((automation) => automation.id),
    ).toEqual(["2", "3"]);

    expect(
      sortAutomationsByProjectRelevance(
        automations,
        "handprint/agent-vinbox",
      ).map((automation) => automation.name),
    ).toEqual(["Alpha", "Beta", "Zeta"]);

    expect(
      countAutomationsForRepository(automations, "handprint/agent-vinbox"),
    ).toBe(2);
  });

  it("filters and sorts tracks with project tracks first", () => {
    const tracks = [
      buildTrack({ name: "public-z", source: "public" }),
      buildTrack({ name: "project-a", source: "project" }),
      buildTrack({ name: "personal-b", source: "user" }),
    ];

    expect(
      filterTracksByProjectScope(
        tracks,
        CONVERSATION_OVERVIEW_PROJECT_SCOPE.project,
        "/workspace/demo",
      ).map((track) => track.name),
    ).toEqual(["project-a"]);

    expect(
      sortTracksByProjectRelevance(tracks, "/workspace/demo").map(
        (track) => track.name,
      ),
    ).toEqual(["project-a", "personal-b", "public-z"]);

    expect(countTracksForProject(tracks, "/workspace/demo")).toBe(1);
  });
});
