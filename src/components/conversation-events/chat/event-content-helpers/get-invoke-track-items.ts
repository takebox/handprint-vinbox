import { ObservationEvent } from "#/types/agent-server/core";
import { InvokeTrackObservation } from "#/types/agent-server/core/base/observation";
import { TrackReadyItem } from "./get-track-ready-content";

/**
 * Maps an InvokeTrackObservation to the TrackReadyItem shape so invoke-track
 * tool calls can reuse the Track Ready expandable list. A single track is
 * invoked per observation, so this yields at most one item. Returns an empty
 * array when there is neither a track name nor any text content to show, which
 * tells the caller to fall back to the default markdown body.
 */
export const getInvokeTrackItems = (
  event: ObservationEvent<InvokeTrackObservation>,
): TrackReadyItem[] => {
  const { observation } = event;

  const content = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n")
    .trim();

  if (!observation.track_name && !content) {
    return [];
  }

  return [{ name: observation.track_name, content }];
};
