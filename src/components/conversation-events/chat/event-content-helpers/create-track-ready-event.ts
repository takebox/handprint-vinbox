import { MessageEvent } from "#/types/agent-server/core";
import { BaseEvent } from "#/types/agent-server/core/base/event";
import {
  getTrackReadyContent,
  getTrackReadyItems,
  TrackReadyItem,
} from "./get-track-ready-content";

export type { TrackReadyItem };

/**
 * Synthetic event type for Track Ready events.
 * This extends BaseEvent and includes a marker to identify it as a track ready event.
 */
export interface TrackReadyEvent extends BaseEvent {
  _isTrackReadyEvent: true;
  _trackReadyContent: string;
  _trackReadyItems: TrackReadyItem[];
}

/**
 * Type guard for Track Ready events.
 */
export const isTrackReadyEvent = (event: unknown): event is TrackReadyEvent =>
  typeof event === "object" &&
  event !== null &&
  "_isTrackReadyEvent" in event &&
  event._isTrackReadyEvent === true;

/**
 * Creates a synthetic "Track Ready" event from a user MessageEvent.
 * This event appears as originating from the agent and contains formatted
 * information about activated tracks and extended content.
 */
export const createTrackReadyEvent = (
  userEvent: MessageEvent,
): TrackReadyEvent => {
  const activatedTracks = userEvent.activated_tracks || [];

  const extendedContent = userEvent.extended_content || [];

  // Only create event if we have tracks or extended content
  if (activatedTracks.length === 0 && extendedContent.length === 0) {
    throw new Error(
      "Cannot create track ready event without activated tracks or extended content",
    );
  }

  const content = getTrackReadyContent(activatedTracks, extendedContent);
  const items = getTrackReadyItems(activatedTracks, extendedContent);

  return {
    id: `${userEvent.id}-track-ready`,
    timestamp: userEvent.timestamp,
    source: "agent",
    _isTrackReadyEvent: true,
    _trackReadyContent: content,
    _trackReadyItems: items,
  };
};
