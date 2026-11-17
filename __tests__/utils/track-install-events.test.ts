import { describe, expect, it } from "vitest";
import { detectTrackInstalls } from "#/utils/track-install-events";
import type {
  CmdOutputMetadata,
  ExecuteBashObservation,
  ObservationEvent,
} from "#/types/agent-server/core";
import { createUserMessageEvent } from "test-utils";

const successLine = (track: string, dest: string) =>
  `Fetching track '${track}'...\n✅ Successfully installed '${track}' to ${dest}`;

const makeBashObservationEvent = (
  id: string,
  text: string,
  overrides: Partial<ExecuteBashObservation> = {},
): ObservationEvent<ExecuteBashObservation> => ({
  id,
  timestamp: new Date().toISOString(),
  source: "environment",
  tool_name: "execute_bash",
  tool_call_id: `call-${id}`,
  action_id: `action-${id}`,
  observation: {
    kind: "ExecuteBashObservation",
    content: [{ type: "text", text }],
    command:
      'python3 /tracks/add-track/scripts/fetch_track.py "https://github.com/o/r/tree/main/tracks/s" "/ws"',
    exit_code: 0,
    error: false,
    timeout: false,
    metadata: {} as CmdOutputMetadata,
    ...overrides,
  },
});

describe("detectTrackInstalls", () => {
  it("detects a successful install and extracts the track name, workspace, and event id", () => {
    const events = [
      createUserMessageEvent("evt-msg"),
      makeBashObservationEvent(
        "evt-install",
        successLine("codereview", "/tmp/demo-ws/.agents/tracks/codereview"),
      ),
    ];

    const installs = detectTrackInstalls(events);

    expect(installs).toEqual([
      {
        eventId: "evt-install",
        trackName: "codereview",
        workspacePath: "/tmp/demo-ws",
      },
    ]);
  });

  it("ignores bash output without the success marker", () => {
    const events = [
      makeBashObservationEvent(
        "evt-fail",
        "❌ No TRACK.md found in 'tracks/broken' - not a valid track",
        { exit_code: 1, error: true },
      ),
    ];

    expect(detectTrackInstalls(events)).toEqual([]);
  });

  it("ignores a success line whose destination is not a .agents/tracks path", () => {
    const events = [
      makeBashObservationEvent(
        "evt-odd",
        successLine("codereview", "/tmp/elsewhere/codereview"),
      ),
    ];

    expect(detectTrackInstalls(events)).toEqual([]);
  });

  it("detects an install on a soft-timeout continuation observation", () => {
    const events = [
      makeBashObservationEvent(
        "evt-timeout",
        successLine("codereview", "/tmp/demo-ws/.agents/tracks/codereview"),
        { command: "", exit_code: -1 },
      ),
    ];

    expect(detectTrackInstalls(events)).toHaveLength(1);
  });

  it("keeps only the latest event for a re-installed track", () => {
    const dest = "/tmp/demo-ws/.agents/tracks/codereview";
    const events = [
      makeBashObservationEvent("evt-first", successLine("codereview", dest)),
      makeBashObservationEvent("evt-second", successLine("codereview", dest)),
    ];

    const installs = detectTrackInstalls(events);

    expect(installs).toEqual([
      expect.objectContaining({ eventId: "evt-second" }),
    ]);
  });

  it("normalizes Windows-style destination paths", () => {
    const events = [
      makeBashObservationEvent(
        "evt-win",
        successLine("codereview", "C:\\ws\\.agents\\tracks\\codereview"),
      ),
    ];

    expect(detectTrackInstalls(events)).toEqual([
      expect.objectContaining({ workspacePath: "C:/ws" }),
    ]);
  });
});
