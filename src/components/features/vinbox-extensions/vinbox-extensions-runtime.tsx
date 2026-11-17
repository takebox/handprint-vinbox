import React from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import VinboxExtensionsService from "#/api/vinbox-extensions-service";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { mountVinboxExtensionAppView } from "#/extensions/vinbox-extension-app-view";
import { loadVinboxExtensionModule } from "#/extensions/vinbox-extension-module-loader";
import { useVinboxExtensions } from "#/hooks/query/use-vinbox-extensions";
import { I18nKey } from "#/i18n/declaration";
import {
  VINBOX_EXTENSION_HOST_API_VERSION,
  type VinboxExtensionDispose,
  type VinboxExtensionHost,
  type VinboxExtensionModule,
  type VinboxExtensionPageContribution,
  type VinboxExtensionPageMount,
  type InstalledVinboxExtensionInfo,
} from "#/types/vinbox-extension";

export interface RegisteredVinboxExtensionPage {
  extension: InstalledVinboxExtensionInfo;
  contribution: VinboxExtensionPageContribution;
  mount: VinboxExtensionPageMount;
  href: string;
}

interface VinboxExtensionsRuntimeValue {
  pages: RegisteredVinboxExtensionPage[];
  activating: boolean;
  errors: ReadonlyMap<string, string>;
}

const EMPTY_RUNTIME: VinboxExtensionsRuntimeValue = {
  pages: [],
  activating: false,
  errors: new Map(),
};

const VinboxExtensionsRuntimeContext =
  React.createContext<VinboxExtensionsRuntimeValue>(EMPTY_RUNTIME);

export function useVinboxExtensionsRuntime(): VinboxExtensionsRuntimeValue {
  return React.useContext(VinboxExtensionsRuntimeContext);
}

function isValidSegment(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

export function buildVinboxExtensionPageHref(
  extensionName: string,
  contributionPath: string,
): string {
  return `/extensions/${encodeURIComponent(extensionName)}/${contributionPath
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function getDeclaredPage(
  extension: InstalledVinboxExtensionInfo,
  contributionId: string,
): VinboxExtensionPageContribution {
  const contribution = extension.manifest?.contributes?.pages?.find(
    (page) => page.id === contributionId,
  );
  if (!contribution) {
    throw new Error(
      `Extension ${extension.name} registered undeclared page "${contributionId}".`,
    );
  }
  // The backend declares page paths as absolute routes (e.g. "/dashboard");
  // normalize to the relative form used for hrefs and route matching.
  const normalizedPath = contribution.path.replace(/^\/+/, "");
  if (
    !isValidSegment(extension.name) ||
    !isValidSegment(contribution.id) ||
    !normalizedPath.split("/").every(isValidSegment)
  ) {
    throw new Error(
      `Extension ${extension.name} has an invalid page name, id, or path.`,
    );
  }
  return { ...contribution, path: normalizedPath };
}

type VinboxExtensionModuleLoader = (
  source: string,
) => Promise<VinboxExtensionModule>;

interface VinboxExtensionsRuntimeProviderProps {
  children: React.ReactNode;
  /** Test seam for environments that cannot import browser Blob URLs. */
  moduleLoader?: VinboxExtensionModuleLoader;
}

export function VinboxExtensionsRuntimeProvider({
  children,
  moduleLoader = loadVinboxExtensionModule,
}: VinboxExtensionsRuntimeProviderProps) {
  const active = useActiveBackend();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("handprint");
  const query = useVinboxExtensions();
  const [pages, setPages] = React.useState<RegisteredVinboxExtensionPage[]>([]);
  const [errors, setErrors] = React.useState<ReadonlyMap<string, string>>(
    new Map(),
  );
  const [activating, setActivating] = React.useState(false);

  const enabledExtensions = React.useMemo(
    () => (query.data ?? []).filter((extension) => extension.enabled),
    [query.data],
  );

  // `useActiveBackend` can synthesize a fresh `backend` object on every render
  // (e.g. when mounted without an <ActiveBackendProvider>), and refetches
  // produce new extension arrays with identical content. The activation effect
  // therefore keys on this value signature — backend identity plus the enabled
  // inventory, whose `installedAt` catches a same-version refresh — and reads
  // the current objects from refs, so referential churn never tears down and
  // re-activates extensions.
  const activationSignature = React.useMemo(
    () =>
      JSON.stringify({
        backendId: active.backend.id,
        backendKind: active.backend.kind,
        connectionRevision: active.backend.connectionRevision ?? 0,
        orgId: active.orgId,
        extensions: enabledExtensions.map((extension) => ({
          name: extension.name,
          version: extension.version,
          resolvedRef: extension.resolved_ref ?? null,
          installedAt: extension.installed_at,
          pages: extension.manifest?.contributes?.pages ?? [],
        })),
      }),
    [
      active.backend.id,
      active.backend.kind,
      active.backend.connectionRevision,
      active.orgId,
      enabledExtensions,
    ],
  );
  const activeRef = React.useRef(active);
  activeRef.current = active;
  const enabledExtensionsRef = React.useRef(enabledExtensions);
  enabledExtensionsRef.current = enabledExtensions;
  const appViewLabels = React.useMemo(
    () => ({
      loading: t(I18nKey.SETTINGS$APPS_VIEW_LOADING),
      retry: t(I18nKey.SETTINGS$APPS_VIEW_RETRY),
      openInNewTab: t(I18nKey.SETTINGS$APPS_VIEW_OPEN_NEW_TAB),
      unavailable: t(I18nKey.SETTINGS$APPS_VIEW_UNAVAILABLE),
    }),
    [i18n.resolvedLanguage, t],
  );
  const appViewLabelsRef = React.useRef(appViewLabels);
  appViewLabelsRef.current = appViewLabels;

  React.useEffect(() => {
    let cancelled = false;
    const disposers: VinboxExtensionDispose[] = [];
    const { backend, orgId } = activeRef.current;
    const extensionsToActivate = enabledExtensionsRef.current;
    setPages([]);
    setErrors(new Map());
    setActivating(extensionsToActivate.length > 0);

    const activateExtension = async (
      extension: InstalledVinboxExtensionInfo,
    ) => {
      const registeredPages = new Map<string, RegisteredVinboxExtensionPage>();
      const registrationDisposers: VinboxExtensionDispose[] = [];
      try {
        const source = await VinboxExtensionsService.fetchBundle(
          extension.name,
          backend,
        );
        if (cancelled) return;
        const extensionModule = await moduleLoader(source);
        if (cancelled) return;
        const appBackendViewClient =
          await VinboxExtensionsService.createAppBackendViewClient(
            extension.name,
            backend,
          ).catch(() => null);
        if (cancelled) {
          appBackendViewClient?.dispose();
          return;
        }
        const mountedAppViews = new Set<VinboxExtensionDispose>();
        const disposeAppBackendViews = () => {
          for (const dispose of mountedAppViews) dispose();
          mountedAppViews.clear();
          appBackendViewClient?.dispose();
        };
        disposers.push(disposeAppBackendViews);

        const host: VinboxExtensionHost = {
          apiVersion: VINBOX_EXTENSION_HOST_API_VERSION,
          extension: Object.freeze({
            name: extension.name,
            version: extension.version,
            resolvedRef: extension.resolved_ref ?? null,
          }),
          backend: Object.freeze({
            id: backend.id,
            kind: backend.kind,
            orgId,
          }),
          registerPage: (contributionId, mount) => {
            if (registeredPages.has(contributionId)) {
              throw new Error(
                `Extension ${extension.name} registered page "${contributionId}" more than once.`,
              );
            }
            const contribution = getDeclaredPage(extension, contributionId);
            const page: RegisteredVinboxExtensionPage = {
              extension,
              contribution,
              mount,
              href: buildVinboxExtensionPageHref(
                extension.name,
                contribution.path,
              ),
            };
            registeredPages.set(contributionId, page);
            const unregister = () => registeredPages.delete(contributionId);
            registrationDisposers.push(unregister);
            return unregister;
          },
          navigate: (path) => navigate(path),
          agentServer: {
            request: (request) =>
              VinboxExtensionsService.requestAgentServer(request, backend),
          },
          ...(appBackendViewClient
            ? {
                appBackendView: {
                  mount: ({ container }) => {
                    const mounted = mountVinboxExtensionAppView({
                      container,
                      labels: appViewLabelsRef.current,
                      createSession: ({ signal }) =>
                        appBackendViewClient.createSession(signal),
                      revokeSession: () => appBackendViewClient.revokeSession(),
                    });
                    let disposed = false;
                    const dispose = () => {
                      if (disposed) return;
                      disposed = true;
                      mountedAppViews.delete(dispose);
                      mounted.dispose();
                    };
                    mountedAppViews.add(dispose);
                    return dispose;
                  },
                },
              }
            : {}),
        };

        let disposeActivation: void | VinboxExtensionDispose;
        try {
          disposeActivation = await extensionModule.activate(host);
        } catch (error) {
          disposeAppBackendViews();
          throw error;
        }
        if (cancelled) {
          if (typeof disposeActivation === "function") disposeActivation();
          disposeAppBackendViews();
          return;
        }
        if (typeof disposeActivation === "function") {
          disposers.push(disposeActivation);
        }
        disposers.push(...registrationDisposers);
        setPages((current) => [
          ...current.filter((page) => page.extension.name !== extension.name),
          ...registeredPages.values(),
        ]);
      } catch (error) {
        registrationDisposers.forEach((dispose) => dispose());
        if (cancelled) return;
        const message =
          error instanceof Error
            ? error.message
            : "Extension activation failed.";
        setErrors((current) => {
          const next = new Map(current);
          next.set(extension.name, message);
          return next;
        });
      }
    };

    void Promise.all(extensionsToActivate.map(activateExtension)).finally(
      () => {
        if (!cancelled) setActivating(false);
      },
    );

    return () => {
      cancelled = true;
      setPages([]);
      for (const dispose of disposers.reverse()) {
        try {
          dispose();
        } catch (error) {
          console.error("Vinbox Extension cleanup failed", error);
        }
      }
    };
  }, [activationSignature, moduleLoader, navigate]);

  const value = React.useMemo(
    () => ({ pages, activating, errors }),
    [pages, activating, errors],
  );

  return (
    <VinboxExtensionsRuntimeContext.Provider value={value}>
      {children}
    </VinboxExtensionsRuntimeContext.Provider>
  );
}
