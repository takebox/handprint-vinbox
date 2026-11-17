import type { TrackInfo } from "#/types/settings";
import { getActiveBackend } from "../backend-registry/active-store";
import type { Backend } from "../backend-registry/types";
import { callCloudProxy } from "./proxy";

interface CloudTracksPage {
  items: TrackInfo[];
  next_page_id: string | null;
}

const PAGE_LIMIT = 100;

function getActiveCloudBackend(): Backend {
  const active = getActiveBackend().backend;
  if (active.kind !== "cloud") {
    throw new Error("Cloud tracks call requires a cloud backend.");
  }
  return active;
}

/**
 * Fetch the full list of tracks from the cloud backend. The cloud endpoint is
 * paginated (page_id cursor); we walk all pages so the settings UI gets a
 * complete list in one call. The cloud TrackInfo shape
 * (name/type/source/triggers) matches the GUI's TrackInfo type, so items are
 * passed through unchanged.
 */
export async function fetchCloudTracks(): Promise<TrackInfo[]> {
  const backend = getActiveCloudBackend();

  const tracks: TrackInfo[] = [];
  let pageId: string | null = null;

  do {
    const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
    if (pageId) query.set("page_id", pageId);

    const page = await callCloudProxy<CloudTracksPage>({
      backend,
      method: "GET",
      path: `/api/v1/tracks/search?${query.toString()}`,
    });

    tracks.push(...(page.items ?? []));
    pageId = page.next_page_id;
  } while (pageId);

  return tracks;
}

interface CloudConversationTrack {
  name: string;
  type: TrackInfo["type"];
  content: string;
  triggers: string[];
}

interface CloudConversationTracksResponse {
  tracks: CloudConversationTrack[];
}

/**
 * Fetch the tracks loaded into a running cloud conversation from the
 * per-conversation route (the one the Handprint web UI's own "Show Available
 * Tracks" modal uses). Unlike `/api/v1/tracks/search`, which only scans the
 * API host's built-in tracks directory, this resolves the conversation's
 * sandbox and asks its agent-server for the merged set: public catalog,
 * user/org repos, project tracks and auto-loaded marketplace plugins. The
 * route reports no `source`, so it is `null`.
 */
export async function fetchCloudConversationTracks(
  conversationId: string,
): Promise<TrackInfo[]> {
  const backend = getActiveCloudBackend();

  const data = await callCloudProxy<CloudConversationTracksResponse>({
    backend,
    method: "GET",
    path: `/api/v1/app-conversations/${conversationId}/tracks`,
  });

  return (data?.tracks ?? []).map((track) => ({ ...track, source: null }));
}
