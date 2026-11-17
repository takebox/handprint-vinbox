import { useQuery } from "@tanstack/react-query";
import TracksService from "#/api/tracks-service";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { useOptionalConversationId } from "#/hooks/use-conversation-id";
import { TrackInfo } from "#/types/settings";
import { useActiveConversation } from "./use-active-conversation";

/**
 * Tracks catalog scoped to the active conversation, so the slash-command menu
 * and tracks modal list the same tracks that were loaded into it.
 *
 * Cloud: the per-conversation route reports what the conversation's
 * agent-server actually loaded (public catalog, user/org repos, project
 * tracks, auto-loaded marketplace plugins); the global `/api/v1/tracks/search`
 * catalog only scans the API host's built-in tracks directory. The route needs
 * a running sandbox, which `useActiveConversation` polls for.
 *
 * Local (and cloud with no conversation route, e.g. the home page): the
 * workspace-scoped catalog, falling back to the global workspace dir for
 * "No workspace" conversations (`selected_workspace` is null).
 */
export const useConversationTracks = () => {
  const isCloud = useActiveBackend().backend.kind === "cloud";
  const { conversationId } = useOptionalConversationId();
  const { data: conversation } = useActiveConversation();
  const projectDir = conversation?.selected_workspace ?? undefined;
  // Keyed on the route id so a still-loading cloud conversation does not fall
  // back to the global catalog; only a missing route does.
  const cloudConversationId = isCloud ? conversationId : null;

  return useQuery<TrackInfo[]>({
    queryKey: cloudConversationId
      ? ["conversation", cloudConversationId, "tracks"]
      : ["tracks", projectDir ?? null],
    queryFn: () =>
      cloudConversationId
        ? TracksService.getConversationTracks(cloudConversationId)
        : TracksService.getTracks(projectDir),
    // The cloud route 404s until the sandbox runs.
    enabled: !cloudConversationId || conversation?.sandbox_status === "RUNNING",
    staleTime: 1000 * 60 * 10, // 10 minutes – track list rarely changes
    refetchOnWindowFocus: false,
  });
};
