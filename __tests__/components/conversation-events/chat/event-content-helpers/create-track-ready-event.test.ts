import { describe, expect, it } from "vitest";
import {
  createTrackReadyEvent,
  isTrackReadyEvent,
} from "#/components/conversation-events/chat/event-content-helpers/create-track-ready-event";
import { MessageEvent } from "#/types/agent-server/core";

const makeMessageEvent = (
  overrides: Partial<MessageEvent> = {},
): MessageEvent =>
  ({
    id: "msg-1",
    timestamp: "2024-01-01T00:00:00Z",
    source: "user",
    message: { role: "user", content: [{ type: "text", text: "test" }] },
    activated_tracks: [],
    extended_content: [],
    ...overrides,
  }) as MessageEvent;

describe("createTrackReadyEvent", () => {
  it("includes _trackReadyItems with structured track data", () => {
    const event = makeMessageEvent({
      activated_tracks: ["docker"],
      extended_content: [
        { type: "text", text: "<EXTRA_INFO>Docker guide</EXTRA_INFO>" },
      ],
    });

    const result = createTrackReadyEvent(event);

    expect(result._trackReadyItems).toEqual([
      { name: "docker", content: "Docker guide" },
    ]);
  });

  it("sets correct id and source", () => {
    const event = makeMessageEvent({
      id: "msg-42",
      activated_tracks: ["track1"],
      extended_content: [
        { type: "text", text: "<EXTRA_INFO>content</EXTRA_INFO>" },
      ],
    });

    const result = createTrackReadyEvent(event);

    expect(result.id).toBe("msg-42-track-ready");
    expect(result.source).toBe("agent");
    expect(result._isTrackReadyEvent).toBe(true);
  });

  it("throws when no tracks and no extended content", () => {
    const event = makeMessageEvent();

    expect(() => createTrackReadyEvent(event)).toThrow(
      "Cannot create track ready event",
    );
  });
});

describe("isTrackReadyEvent", () => {
  it("returns true for valid TrackReadyEvent", () => {
    const event = makeMessageEvent({
      activated_tracks: ["track1"],
      extended_content: [
        { type: "text", text: "<EXTRA_INFO>content</EXTRA_INFO>" },
      ],
    });

    expect(isTrackReadyEvent(createTrackReadyEvent(event))).toBe(true);
  });

  it("returns false for plain objects", () => {
    expect(isTrackReadyEvent({})).toBe(false);
    expect(isTrackReadyEvent(null)).toBe(false);
    expect(isTrackReadyEvent({ _isTrackReadyEvent: false })).toBe(false);
  });
});
