import { describe, expect, it } from "vitest";
import { getInvokeTrackItems } from "#/components/conversation-events/chat/event-content-helpers/get-invoke-track-items";
import { ObservationEvent } from "#/types/agent-server/core";
import { InvokeTrackObservation } from "#/types/agent-server/core/base/observation";

const makeEvent = (
  observation: Partial<InvokeTrackObservation>,
): ObservationEvent<InvokeTrackObservation> =>
  ({
    id: "obs-track",
    timestamp: "2026-06-08T00:00:00.000Z",
    source: "environment",
    tool_name: "invoke_track",
    tool_call_id: "tool-track",
    action_id: "action-track",
    observation: {
      kind: "InvokeTrackObservation",
      track_name: "worktree-switch",
      content: [],
      ...observation,
    },
  }) as ObservationEvent<InvokeTrackObservation>;

describe("getInvokeTrackItems", () => {
  it("returns a single item with the track name and joined text content", () => {
    const items = getInvokeTrackItems(
      makeEvent({
        track_name: "worktree-switch",
        content: [{ type: "text", text: "# Track content" }],
      }),
    );

    expect(items).toEqual([
      { name: "worktree-switch", content: "# Track content" },
    ]);
  });

  it("joins multiple text blocks with newlines and trims", () => {
    const items = getInvokeTrackItems(
      makeEvent({
        track_name: "docker",
        content: [
          { type: "text", text: "  line one" },
          { type: "text", text: "line two  " },
        ],
      }),
    );

    expect(items).toEqual([{ name: "docker", content: "line one\nline two" }]);
  });

  it("ignores non-text content blocks", () => {
    const items = getInvokeTrackItems(
      makeEvent({
        track_name: "docker",
        content: [
          { type: "image", image_urls: ["data:image/png;base64,abc"] },
          { type: "text", text: "only text survives" },
        ] as InvokeTrackObservation["content"],
      }),
    );

    expect(items).toEqual([{ name: "docker", content: "only text survives" }]);
  });

  it("returns an empty array when there is no track name and no content", () => {
    const items = getInvokeTrackItems(
      makeEvent({ track_name: "", content: [] }),
    );

    expect(items).toEqual([]);
  });
});
