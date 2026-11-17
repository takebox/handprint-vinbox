import { useQuery } from "@tanstack/react-query";
import VinboxExtensionsService from "#/api/vinbox-extensions-service";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { VINBOX_EXTENSIONS_QUERY_KEYS } from "#/hooks/query/query-keys";

export function useVinboxExtensionIcon(name: string, enabled: boolean) {
  const active = useActiveBackend();

  return useQuery({
    queryKey: VINBOX_EXTENSIONS_QUERY_KEYS.icon(
      active.backend.id,
      active.orgId,
      active.backend.connectionRevision ?? 0,
      name,
    ),
    queryFn: () => VinboxExtensionsService.fetchIcon(name),
    enabled,
    retry: false,
    meta: { disableToast: true },
  });
}
