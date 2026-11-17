import { useQuery } from "@tanstack/react-query";
import VinboxExtensionsService from "#/api/vinbox-extensions-service";
import { isNoBackend } from "#/api/backend-registry/active-store";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { VINBOX_EXTENSIONS_QUERY_KEYS } from "#/hooks/query/query-keys";

interface UseVinboxExtensionsOptions {
  enabled?: boolean;
}

export function useVinboxExtensions(options: UseVinboxExtensionsOptions = {}) {
  const active = useActiveBackend();
  const connectionRevision = active.backend.connectionRevision ?? 0;
  const backendSupported =
    !isNoBackend(active.backend) && active.backend.kind === "local";

  return useQuery({
    queryKey: VINBOX_EXTENSIONS_QUERY_KEYS.installed(
      active.backend.id,
      active.orgId,
      connectionRevision,
    ),
    queryFn: () => VinboxExtensionsService.listInstalled(),
    enabled: (options.enabled ?? true) && backendSupported,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: true,
    meta: {
      backendId: active.backend.id,
      // An old backend returning 404 is an expected capability result. The
      // management page renders it and the global runtime stays quiet.
      disableToast: true,
    },
  });
}
