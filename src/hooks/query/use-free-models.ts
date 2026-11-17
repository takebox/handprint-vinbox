import React from "react";
import { useQuery } from "@tanstack/react-query";
import ConfigService from "#/api/config-service/config-service.api";
import type { LLMModel } from "#/api/config-service/config-service.types";
import type { FreeModelSet } from "#/utils/format-model-name";
import { useFreeModelsStore } from "#/stores/free-models-store";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { isNoBackend } from "#/api/backend-registry/active-store";
import {
  VERIFIED_MODELS_GC_TIME,
  VERIFIED_MODELS_QUERY_KEY,
  VERIFIED_MODELS_STALE_TIME,
  fetchVerifiedModelsByProvider,
} from "./use-verified-models";

/**
 * Provider whose models carry free / default metadata. Both are
 * Handprint-managed concepts, so they are scoped to the `handprint` provider.
 */
const HANDPRINT_PROVIDER = "handprint";
const CLOUD_MODEL_SEARCH_PAGE_LIMIT = 100;
const MAX_PAGINATION_DEPTH = 10;

async function fetchAllHandprintModels(
  verifiedByProvider: Record<string, string[]>,
  pageId: string | null | undefined,
  seenPageIds: Set<string>,
  depth: number,
): Promise<LLMModel[]> {
  if (depth >= MAX_PAGINATION_DEPTH) {
    throw new Error(
      `Too many pagination requests while fetching Handprint models (depth=${depth})`,
    );
  }

  const page = await ConfigService.searchModels(
    {
      provider__eq: HANDPRINT_PROVIDER,
      limit: CLOUD_MODEL_SEARCH_PAGE_LIMIT,
      ...(pageId ? { page_id: pageId } : {}),
    },
    verifiedByProvider,
  );

  if (!page.next_page_id) {
    return page.items;
  }

  if (seenPageIds.has(page.next_page_id)) {
    throw new Error(
      `Repeated page id while fetching Handprint models: ${page.next_page_id}`,
    );
  }
  seenPageIds.add(page.next_page_id);

  const rest = await fetchAllHandprintModels(
    verifiedByProvider,
    page.next_page_id,
    seenPageIds,
    depth + 1,
  );
  return [...page.items, ...rest];
}

/**
 * Fetches the `handprint` provider's models with their DB-driven `free` /
 * `default` flags (the same channel that carries `verified`). Disabled while
 * no backend is configured (first-run onboarding, the API-key screen): there
 * is nothing to ask, and the request would only fail with
 * `NoBackendAvailableError` and raise the global error toast.
 */
const useHandprintModels = (hasBackend: boolean) => {
  const { backend, orgId } = useActiveBackend();
  const backendScope = [
    backend.id,
    backend.connectionRevision ?? 0,
    orgId,
  ] as const;

  return useQuery({
    queryKey: [
      "config",
      "models",
      HANDPRINT_PROVIDER,
      "flags",
      ...backendScope,
    ],
    queryFn: async ({ client }): Promise<LLMModel[]> => {
      const verifiedByProvider = await client.fetchQuery({
        queryKey: [...VERIFIED_MODELS_QUERY_KEY, ...backendScope],
        queryFn: fetchVerifiedModelsByProvider,
        staleTime: VERIFIED_MODELS_STALE_TIME,
      });
      return fetchAllHandprintModels(verifiedByProvider, null, new Set(), 0);
    },
    enabled: hasBackend,
    staleTime: VERIFIED_MODELS_STALE_TIME,
    gcTime: VERIFIED_MODELS_GC_TIME,
  });
};

/**
 * Fetches the DB-driven free / default flags once and mirrors them into the
 * {@link useFreeModelsStore}. Mount this high in the tree (inside the query
 * provider). Leaf display components then read the flags synchronously via the
 * {@link useFreeModels} / {@link useDefaultModel} zustand selectors, so they
 * stay renderable in isolation without a QueryClientProvider in scope.
 */
export const useHydrateFreeModels = (): void => {
  const { backend, orgId } = useActiveBackend();
  const hasBackend = !isNoBackend(backend);
  const { data, isError } = useHandprintModels(hasBackend);
  const setFlags = useFreeModelsStore((state) => state.setFlags);
  const markDefaultModelReady = useFreeModelsStore(
    (state) => state.markDefaultModelReady,
  );
  const resetFlags = useFreeModelsStore((state) => state.resetFlags);

  React.useEffect(() => {
    resetFlags();
  }, [backend.id, backend.connectionRevision, orgId, resetFlags]);

  React.useEffect(() => {
    if (!data) return;
    const freeModels = new Set(
      data
        .filter((model) => model.free)
        .map((model) => `${HANDPRINT_PROVIDER}/${model.name}`),
    );
    const defaultEntry = data.find((model) => model.default);
    setFlags({
      freeModels,
      defaultModel: defaultEntry
        ? `${HANDPRINT_PROVIDER}/${defaultEntry.name}`
        : null,
    });
  }, [data, setFlags]);

  // With no backend there are no flags to wait for, so the default model is
  // settled (as null) right away.
  React.useEffect(() => {
    if (isError || !hasBackend) markDefaultModelReady();
  }, [isError, hasBackend, markDefaultModelReady]);
};

/**
 * Set of free ``handprint/<model>`` ids, sourced from the backend model list
 * (DB-driven on cloud via the `free` flag). Returns an empty set on backends
 * without free metadata (e.g. the local agent-server), so callers uniformly
 * treat "not in set" as paid and the frontend keeps no hardcoded free list.
 */
export const useFreeModels = (): FreeModelSet =>
  useFreeModelsStore((state) => state.freeModels);

/**
 * DB-driven default Handprint model id (``handprint/<model>``), used to
 * preselect a model on onboarding and when creating a new Handprint model.
 * Returns `null` on backends without default metadata.
 */
export const useDefaultModel = (): string | null =>
  useFreeModelsStore((state) => state.defaultModel);

export const useDefaultModelReady = (): boolean =>
  useFreeModelsStore((state) => state.defaultModelReady);
