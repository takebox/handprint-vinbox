import { TracksClient } from "@handprint-ai/typescript-client/clients";
import {
  TRACKS_CATALOG,
  type TrackCatalogEntry,
} from "@handprint-ai/extensions/tracks";
import { TrackInfo } from "#/types/settings";
import { getAgentServerWorkingDir } from "./agent-server-config";
import { getActiveBackend } from "./backend-registry/active-store";
import {
  fetchCloudConversationTracks,
  fetchCloudTracks,
} from "./cloud/tracks-service.api";
import { getAgentServerClientOptions } from "./agent-server-client-options";

function catalogEntryToTrackInfo(entry: TrackCatalogEntry): TrackInfo {
  return {
    name: entry.name,
    type: "knowledge",
    source: "public",
    description: entry.description,
    triggers: entry.triggers,
    category: entry.category,
    content: entry.content,
    license: entry.license ?? null,
    compatibility: entry.compatibility ?? null,
  };
}

/**
 * Public tracks loaded from the `@handprint-ai/extensions` npm package.
 *
 * This is an **immutable build-time snapshot**: the catalog is baked into the
 * bundle at `npm run build` / `vite build` time and does not change at
 * runtime. Updating the catalog requires bumping the `@handprint-ai/extensions`
 * dependency and rebuilding.
 */
const PUBLIC_TRACKS: TrackInfo[] = TRACKS_CATALOG.map(catalogEntryToTrackInfo);

class TracksService {
  static async getTracks(projectDir?: string): Promise<TrackInfo[]> {
    if (getActiveBackend().backend.kind === "cloud") {
      return fetchCloudTracks();
    }

    // Public tracks come from the bundled @handprint-ai/extensions npm package —
    // no agent-server round-trip or GitHub fetch needed. Only ask the agent-
    // server for user and project tracks so local .agents/tracks/ content is
    // still picked up.
    let localTracks: TrackInfo[] = [];
    try {
      const response = await new TracksClient(
        getAgentServerClientOptions(),
      ).getTracks({
        load_public: false,
        load_user: true,
        load_project: true,
        load_org: false,
        project_dir: projectDir ?? getAgentServerWorkingDir(),
      });
      localTracks = (response.tracks ?? []) as TrackInfo[];
    } catch {
      // Agent-server may not support the tracks endpoint or may be
      // unreachable; fall back to the bundled public catalog alone.
    }

    return [...localTracks, ...PUBLIC_TRACKS];
  }

  /**
   * Tracks loaded into a running cloud conversation (see
   * `fetchCloudConversationTracks`). Cloud-only: local conversations keep
   * using `getTracks(projectDir)`, whose agent-server call already scopes to
   * the conversation's workspace.
   */
  static getConversationTracks(conversationId: string): Promise<TrackInfo[]> {
    return fetchCloudConversationTracks(conversationId);
  }
}

export default TracksService;
