import { useQuery } from "@tanstack/react-query";
import { fetchLatestAgentVinboxVersion } from "#/api/agent-vinbox-updates";
import { APP_UPDATE_QUERY_KEYS } from "./query-keys";

/**
 * Latest published Agent Vinbox version (npm `latest` dist-tag).
 *
 * Information-only: failures must stay quiet (`meta.disableToast`) — the
 * settings update card renders them inline. The card's "Check for updates"
 * button is `refetch()`, which bypasses `staleTime`.
 */
export function useLatestAgentVinboxVersion({
  enabled = true,
}: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: APP_UPDATE_QUERY_KEYS.latestVersion,
    queryFn: ({ signal }) => fetchLatestAgentVinboxVersion(signal),
    enabled,
    // Offline/air-gapped must settle into the quiet inline state immediately
    // rather than sitting through exponential backoff.
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 60, // the settings sidebar remounts per navigation; don't hammer npm
    meta: { disableToast: true },
  });
}
