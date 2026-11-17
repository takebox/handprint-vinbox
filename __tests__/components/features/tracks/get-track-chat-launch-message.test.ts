import { describe, expect, it } from "vitest";
import { TRACKS_CATALOG } from "@handprint-ai/extensions/tracks";
import {
  ADD_TRACK_EXAMPLE_COMMAND,
  ADD_TRACK_TRACK_NAME,
} from "#/constants/tracks-docs";
import { getTrackChatLaunchMessage } from "#/components/features/tracks/get-track-chat-launch-message";

describe("getTrackChatLaunchMessage", () => {
  it("returns the full add-track example command for the add-track track", () => {
    expect(getTrackChatLaunchMessage({ name: ADD_TRACK_TRACK_NAME })).toBe(
      ADD_TRACK_EXAMPLE_COMMAND,
    );
  });

  it("points the add-track example at a track in the bundled extensions catalog", () => {
    const trackName = ADD_TRACK_EXAMPLE_COMMAND.split("/tracks/").at(-1);

    expect(TRACKS_CATALOG.map((entry) => entry.name)).toContain(trackName);
  });

  it("returns a slash-command prefix for other tracks", () => {
    expect(getTrackChatLaunchMessage({ name: "agent-builder" })).toBe(
      "/agent-builder ",
    );
  });
});
