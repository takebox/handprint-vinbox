import { useQuery } from "@tanstack/react-query";
import TracksService from "#/api/tracks-service";
import { TrackInfo } from "#/types/settings";

/**
 * @param projectDir Workspace root to load project tracks from. Conversation
 *   views pass the conversation's own workspace so the catalog matches the
 *   tracks loaded into that conversation; the global Tracks page omits it.
 */
export const useTracks = (projectDir?: string) =>
  useQuery<TrackInfo[]>({
    queryKey: ["tracks", projectDir ?? null],
    queryFn: () => TracksService.getTracks(projectDir),
    staleTime: 1000 * 60 * 10, // 10 minutes – track list rarely changes
    refetchOnWindowFocus: false,
  });
