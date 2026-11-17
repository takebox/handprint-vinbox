import { http, HttpResponse } from "msw";
import type {
  VinboxExtensionManifest,
  InstallVinboxExtensionRequest,
  InstalledVinboxExtensionInfo,
} from "#/types/vinbox-extension";
import demoManifestSource from "#/fixtures/vinbox-extensions/demo-page/vinbox-extension.json?raw";
// eslint-disable-next-line import-x/extensions -- Vite requires the real filename before ?raw.
import demoBundle from "#/fixtures/vinbox-extensions/demo-page/extension.js?raw";

export const VINBOX_EXTENSION_DEMO_SOURCE =
  "src/fixtures/vinbox-extensions/demo-page";

const demoManifest = JSON.parse(demoManifestSource) as VinboxExtensionManifest;

const MOCK_STORAGE_KEY = "handprint-vinbox-extension-dev-installation";

function readPersistedExtension(): InstalledVinboxExtensionInfo | null {
  try {
    const value = globalThis.sessionStorage?.getItem(MOCK_STORAGE_KEY);
    return value ? (JSON.parse(value) as InstalledVinboxExtensionInfo) : null;
  } catch {
    return null;
  }
}

let installedExtension = readPersistedExtension();

function persistInstalledExtension(
  extension: InstalledVinboxExtensionInfo | null,
): void {
  installedExtension = extension;
  try {
    if (extension) {
      globalThis.sessionStorage?.setItem(
        MOCK_STORAGE_KEY,
        JSON.stringify(extension),
      );
    } else {
      globalThis.sessionStorage?.removeItem(MOCK_STORAGE_KEY);
    }
  } catch {
    // The module variable still provides an in-memory fallback.
  }
}

function isDemoSource(source: string): boolean {
  return source.replaceAll("\\", "/").endsWith(VINBOX_EXTENSION_DEMO_SOURCE);
}

function getRequestedName(
  value: string | readonly string[] | undefined,
): string {
  if (!value) return "";
  return decodeURIComponent(Array.isArray(value) ? value[0] : value);
}

function extensionNotFound(name: string) {
  return HttpResponse.json(
    { detail: `Vinbox extension '${name}' is not installed.` },
    { status: 404 },
  );
}

function getInstalledExtension(
  name: string,
): InstalledVinboxExtensionInfo | null {
  if (installedExtension?.name !== name) return null;
  return installedExtension;
}

export function resetVinboxExtensionsMockData(): void {
  persistInstalledExtension(null);
}

/**
 * Browser-development implementation of the Vinbox Extension API contract.
 * It intentionally supports only the checked-in demo fixture. Production and
 * ordinary dev stacks continue to use the active Agent Server exclusively.
 */
export const VINBOX_EXTENSIONS_HANDLERS = [
  http.get("*/api/vinbox-extensions/installed", () =>
    HttpResponse.json({
      vinbox_extensions: installedExtension ? [installedExtension] : [],
    }),
  ),

  http.post("*/api/vinbox-extensions/install", async ({ request }) => {
    const body = (await request.json()) as InstallVinboxExtensionRequest;
    if (!body.source || !isDemoSource(body.source)) {
      return HttpResponse.json(
        {
          detail: `Mock mode only installs '${VINBOX_EXTENSION_DEMO_SOURCE}'.`,
        },
        { status: 400 },
      );
    }

    if (installedExtension && !body.force) {
      return HttpResponse.json(
        {
          detail: `Vinbox extension '${demoManifest.name}' is already installed.`,
        },
        { status: 409 },
      );
    }

    persistInstalledExtension({
      name: demoManifest.name,
      version: demoManifest.version,
      description: demoManifest.description,
      enabled: false,
      source: body.source,
      resolved_ref: body.ref || "mock-working-tree",
      repo_path: body.repo_path || null,
      installed_at: new Date().toISOString(),
      install_path: `/mock/vinbox-extensions/${demoManifest.name}`,
      // The real backend only returns `manifest` once OSS-10048 lands; the
      // mock previews that shape so the demo fixture's pages work in dev mode.
      manifest: demoManifest,
    });

    return HttpResponse.json(installedExtension);
  }),

  http.get("*/api/vinbox-extensions/installed/:name/bundle", ({ params }) => {
    const name = getRequestedName(params.name);
    if (!getInstalledExtension(name)) return extensionNotFound(name);
    return new HttpResponse(demoBundle, {
      headers: {
        "Content-Type": "application/javascript; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    });
  }),

  http.get("*/api/vinbox-extensions/installed/:name", ({ params }) => {
    const name = getRequestedName(params.name);
    const extension = getInstalledExtension(name);
    return extension ? HttpResponse.json(extension) : extensionNotFound(name);
  }),

  http.patch(
    "*/api/vinbox-extensions/installed/:name",
    async ({ params, request }) => {
      const name = getRequestedName(params.name);
      const extension = getInstalledExtension(name);
      if (!extension) return extensionNotFound(name);

      const body = (await request.json()) as { enabled?: unknown };
      if (typeof body.enabled !== "boolean") {
        return HttpResponse.json(
          { detail: "'enabled' must be a boolean." },
          { status: 422 },
        );
      }

      persistInstalledExtension({ ...extension, enabled: body.enabled });
      return HttpResponse.json({ name, enabled: body.enabled });
    },
  ),

  http.delete("*/api/vinbox-extensions/installed/:name", ({ params }) => {
    const name = getRequestedName(params.name);
    if (!getInstalledExtension(name)) return extensionNotFound(name);
    persistInstalledExtension(null);
    return HttpResponse.json({ message: "Vinbox extension uninstalled." });
  }),
];
