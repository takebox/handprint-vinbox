export const VINBOX_EXTENSION_MANIFEST_SCHEMA_VERSION = 1 as const;
export const VINBOX_EXTENSION_HOST_API_VERSION = "1" as const;

export interface VinboxExtensionPageContribution {
  id: string;
  title: string;
  path: string;
  nav_label?: string | null;
  description?: string | null;
}

export interface VinboxExtensionContributions {
  pages?: VinboxExtensionPageContribution[] | null;
}

/** Parsed contents of `vinbox-extension.json`. */
export interface VinboxExtensionManifest {
  schema_version: typeof VINBOX_EXTENSION_MANIFEST_SCHEMA_VERSION;
  name: string;
  display_name?: string | null;
  version: string;
  description?: string | null;
  entrypoint: string;
  contributes?: VinboxExtensionContributions | null;
  /** Package-relative SVG path; served by the Agent Server at `/installed/{name}/icon`. */
  icon?: string | null;
}

export interface InstalledVinboxExtensionInfo {
  name: string;
  version: string;
  description?: string | null;
  enabled: boolean;
  source: string;
  requested_ref?: string | null;
  resolved_ref?: string | null;
  repo_path?: string | null;
  installed_at: string;
  install_path: string;
  /** Absent until the backend exposes page contributions (OSS-10048). */
  manifest?: VinboxExtensionManifest | null;
}

export interface InstallVinboxExtensionRequest {
  source: string;
  ref?: string | null;
  repo_path?: string | null;
  force?: boolean;
}

export type VinboxExtensionDispose = () => void;

export interface VinboxExtensionPageMountContext {
  container: HTMLElement;
  /** Remainder of the route below the page contribution's declared path. */
  path: string;
  navigate: (path: string) => void;
}

export type VinboxExtensionPageMount = (
  context: VinboxExtensionPageMountContext,
) => void | VinboxExtensionDispose | Promise<void | VinboxExtensionDispose>;

export interface VinboxExtensionAgentServerRequest {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}

export interface VinboxExtensionAppBackendViewMountOptions {
  container: HTMLElement;
}

export interface VinboxExtensionAppBackendViewHost {
  mount: (
    options: VinboxExtensionAppBackendViewMountOptions,
  ) => VinboxExtensionDispose;
}

export interface VinboxExtensionHost {
  readonly apiVersion: typeof VINBOX_EXTENSION_HOST_API_VERSION;
  readonly extension: Readonly<{
    name: string;
    version: string;
    resolvedRef: string | null;
  }>;
  readonly backend: Readonly<{
    id: string;
    kind: "local" | "cloud";
    orgId: string | null;
  }>;
  registerPage: (
    contributionId: string,
    mount: VinboxExtensionPageMount,
  ) => VinboxExtensionDispose;
  navigate: (path: string) => void;
  agentServer: {
    request: <T = unknown>(
      request: VinboxExtensionAgentServerRequest,
    ) => Promise<T>;
  };
  readonly appBackendView?: VinboxExtensionAppBackendViewHost;
}

export interface VinboxExtensionModule {
  activate: (
    host: VinboxExtensionHost,
  ) => void | VinboxExtensionDispose | Promise<void | VinboxExtensionDispose>;
}
