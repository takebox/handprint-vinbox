import {
  ADD_TRACK_EXAMPLE_COMMAND,
  ADD_TRACK_TRACK_NAME,
} from "#/constants/tracks-docs";
import type { TrackInfo } from "#/types/settings";

export function getTrackChatLaunchMessage(
  track: Pick<TrackInfo, "name">,
): string {
  if (track.name === ADD_TRACK_TRACK_NAME) {
    return ADD_TRACK_EXAMPLE_COMMAND;
  }

  return `/${track.name} `;
}
