import {
  AgentServerClient,
  VinboxExtensionsClient,
} from "@handprint-ai/typescript-client/clients";
import { getAgentServerClientOptions } from "#/api/agent-server-client-options";
import { isSdkHttpStatusError } from "#/api/agent-server-compatibility";
import type { VinboxExtensionAppViewSession } from "#/extensions/vinbox-extension-app-view";
import {
  getActiveBackend,
  isNoBackend,
} from "#/api/backend-registry/active-store";
import type { Backend } from "#/api/backend-registry/types";
import type {
  VinboxExtensionAgentServerRequest,
  InstallVinboxExtensionRequest,
  InstalledVinboxExtensionInfo,
} from "#/types/vinbox-extension";

const VINBOX_EXTENSIONS_BASE_PATH = "/api/vinbox-extensions";
const VINBOX_APP_BACKEND_BRIDGE_CAPABILITY = "vinbox_app_backend_bridge_v1";
const REMOTE_EXTENSION_SOURCE_PATTERN =
  /^(?:github:|https?:\/\/|git:\/\/|file:\/\/|[\w.-]+@[\w.-]+:)/i;

interface AppBackendServerInfo {
  capabilities?: string[];
  app_backend_ingress_url?: string | null;
}

export interface VinboxExtensionAppBackendViewClient {
  createSession: (
    signal?: AbortSignal,
  ) => Promise<VinboxExtensionAppViewSession>;
  revokeSession: () => Promise<void>;
  dispose: () => void;
}

function parseHttpUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export type VinboxExtensionsUnsupportedReason =
  | "no-backend"
  | "cloud-backend"
  | "missing-api";

export class VinboxExtensionsUnsupportedError extends Error {
  readonly reason: VinboxExtensionsUnsupportedReason;

  constructor(reason: VinboxExtensionsUnsupportedReason) {
    const message =
      reason === "no-backend"
        ? "Add an Agent Server backend to use Apps."
        : reason === "cloud-backend"
          ? "Apps are not available on Cloud backends yet."
          : "This Agent Server does not support Apps yet. Upgrade the backend and try again.";
    super(message);
    this.name = "VinboxExtensionsUnsupportedError";
    this.reason = reason;
  }
}

export function isVinboxExtensionsUnsupportedError(
  error: unknown,
): error is VinboxExtensionsUnsupportedError {
  return (
    error instanceof VinboxExtensionsUnsupportedError ||
    (typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "VinboxExtensionsUnsupportedError")
  );
}

function requireSupportedBackend(): void {
  const { backend } = getActiveBackend();
  if (isNoBackend(backend)) {
    throw new VinboxExtensionsUnsupportedError("no-backend");
  }
  if (backend.kind === "cloud") {
    throw new VinboxExtensionsUnsupportedError("cloud-backend");
  }
}

function getClient(): AgentServerClient {
  requireSupportedBackend();
  return new AgentServerClient(getAgentServerClientOptions());
}

function getClientForBackend(backend: Backend): AgentServerClient {
  if (isNoBackend(backend)) {
    throw new VinboxExtensionsUnsupportedError("no-backend");
  }
  if (backend.kind === "cloud") {
    throw new VinboxExtensionsUnsupportedError("cloud-backend");
  }
  return new AgentServerClient({
    host: backend.host,
    ...(backend.apiKey ? { apiKey: backend.apiKey } : {}),
    timeout: 60000,
  });
}

async function mapUnsupported<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isSdkHttpStatusError(error, 404)) {
      throw new VinboxExtensionsUnsupportedError("missing-api");
    }
    throw error;
  }
}

async function createAppBackendViewClient(
  name: string,
  backend: Backend,
): Promise<VinboxExtensionAppBackendViewClient | null> {
  const clientOptions = getAgentServerClientOptions({
    host: backend.host,
    apiKey: backend.apiKey,
    timeout: 60000,
  });
  const serverClient = new AgentServerClient(clientOptions);
  let info: AppBackendServerInfo;
  try {
    info = (await serverClient.server.getServerInfo()) as AppBackendServerInfo;
  } finally {
    serverClient.close();
  }
  const ingressUrl = info.app_backend_ingress_url
    ? parseHttpUrl(info.app_backend_ingress_url)
    : null;
  if (
    !Array.isArray(info.capabilities) ||
    !info.capabilities.includes(VINBOX_APP_BACKEND_BRIDGE_CAPABILITY) ||
    !ingressUrl
  ) {
    return null;
  }

  const sessionClient = new VinboxExtensionsClient({
    ...clientOptions,
    appBackendIngressUrl: ingressUrl.href,
  });
  let disposed = false;
  let hasSession = false;
  const revokeSession = async () => {
    if (!hasSession) return;
    try {
      await sessionClient.revokeAppBackendSession(name);
    } finally {
      hasSession = false;
    }
  };
  return {
    createSession: async (signal) => {
      if (disposed) throw new Error("Vinbox App backend view is disposed");
      const session = await sessionClient.createAppBackendSession(name, signal);
      hasSession = true;
      const sessionUrl = parseHttpUrl(session.ingress_url);
      if (sessionUrl?.origin !== ingressUrl.origin) {
        await revokeSession();
        throw new Error("Vinbox App backend session URL is invalid");
      }
      return {
        url: sessionUrl.href,
        expiresAt: session.expires_at,
        iframeSandbox: session.iframe_sandbox,
      };
    },
    revokeSession,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      if (!hasSession) {
        sessionClient.close();
        return;
      }
      void revokeSession()
        .catch(() => undefined)
        .finally(() => sessionClient.close());
    },
  };
}

function installedExtensionPath(name: string): string {
  return `${VINBOX_EXTENSIONS_BASE_PATH}/installed/${encodeURIComponent(name)}`;
}

function joinLocalExtensionPath(source: string, repoPath: string): string {
  const separator = source.includes("\\") && !source.includes("/") ? "\\" : "/";
  const basePath = source.replace(/[\\/]+$/, "");
  const childPath = repoPath.replace(/^[\\/]+/, "");

  if (!childPath) return source;
  if (!basePath) return `${separator}${childPath}`;
  return `${basePath}${separator}${childPath}`;
}

function normalizeInstallRequest(
  request: InstallVinboxExtensionRequest,
): InstallVinboxExtensionRequest {
  const repoPath = request.repo_path?.trim();
  if (!repoPath || REMOTE_EXTENSION_SOURCE_PATTERN.test(request.source)) {
    return request;
  }

  return {
    ...request,
    source: joinLocalExtensionPath(request.source, repoPath),
    repo_path: null,
  };
}

class VinboxExtensionsService {
  static async listInstalled(): Promise<InstalledVinboxExtensionInfo[]> {
    const client = getClient();
    const response = await mapUnsupported(() =>
      client.get<{ vinbox_extensions: InstalledVinboxExtensionInfo[] }>(
        `${VINBOX_EXTENSIONS_BASE_PATH}/installed`,
      ),
    );
    return response.vinbox_extensions ?? [];
  }

  static async install(
    request: InstallVinboxExtensionRequest,
  ): Promise<InstalledVinboxExtensionInfo> {
    const client = getClient();
    return mapUnsupported(() =>
      client.post<InstalledVinboxExtensionInfo>(
        `${VINBOX_EXTENSIONS_BASE_PATH}/install`,
        normalizeInstallRequest(request),
      ),
    );
  }

  static async setEnabled(
    name: string,
    enabled: boolean,
  ): Promise<{ name: string; enabled: boolean }> {
    const client = getClient();
    return mapUnsupported(() =>
      client.patch<{ name: string; enabled: boolean }>(
        installedExtensionPath(name),
        { enabled },
      ),
    );
  }

  static async uninstall(name: string): Promise<{ message: string }> {
    const client = getClient();
    return mapUnsupported(() =>
      client.delete<{ message: string }>(installedExtensionPath(name)),
    );
  }

  static async fetchBundle(name: string, backend?: Backend): Promise<string> {
    const client = backend ? getClientForBackend(backend) : getClient();
    return mapUnsupported(() =>
      client.get<string>(`${installedExtensionPath(name)}/bundle`, {
        responseType: "text",
      }),
    );
  }

  static async createAppBackendViewClient(
    name: string,
    backend: Backend,
  ): Promise<VinboxExtensionAppBackendViewClient | null> {
    if (isNoBackend(backend) || backend.kind === "cloud") return null;
    return createAppBackendViewClient(name, backend);
  }

  static async fetchIcon(name: string): Promise<Blob> {
    const client = getClient();
    return mapUnsupported(() =>
      client.get<Blob>(`${installedExtensionPath(name)}/icon`, {
        responseType: "blob",
      }),
    );
  }

  static async requestAgentServer<T = unknown>(
    request: VinboxExtensionAgentServerRequest,
    backend?: Backend,
  ): Promise<T> {
    if (!request.path.startsWith("/") || request.path.startsWith("//")) {
      throw new Error(
        "Vinbox Extension Agent Server requests must use a root-relative path.",
      );
    }
    const client = backend ? getClientForBackend(backend) : getClient();
    return client.request<T>({
      method: request.method ?? "GET",
      path: request.path,
      body: request.body,
      headers: request.headers,
    });
  }
}

export default VinboxExtensionsService;
