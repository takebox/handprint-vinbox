import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VinboxExtensionsService from "#/api/vinbox-extensions-service";
import {
  setActiveSelection,
  setRegisteredBackends,
} from "#/api/backend-registry/active-store";
import type { Backend } from "#/api/backend-registry/types";
import { ActiveBackendProvider } from "#/contexts/active-backend-context";
import type {
  VinboxExtensionHost,
  InstalledVinboxExtensionInfo,
} from "#/types/vinbox-extension";
import {
  VinboxExtensionsRuntimeProvider,
  useVinboxExtensionsRuntime,
} from "./vinbox-extensions-runtime";

const backend: Backend = {
  id: "extension-backend",
  name: "Extension backend",
  host: "http://127.0.0.1:8000",
  apiKey: "test-key",
  kind: "local",
};

const extension: InstalledVinboxExtensionInfo = {
  name: "demo-extension",
  version: "0.1.0",
  enabled: true,
  source: "github:example/demo",
  resolved_ref: "abc123",
  installed_at: "2026-08-01T00:00:00Z",
  install_path: "/tmp/demo-extension",
  manifest: {
    schema_version: 1,
    name: "demo-extension",
    display_name: "Demo extension",
    version: "0.1.0",
    entrypoint: "dist/extension.js",
    contributes: {
      pages: [
        {
          id: "dashboard",
          title: "Dashboard",
          path: "/dashboard",
          nav_label: "Demo dashboard",
        },
      ],
    },
  },
};

function RuntimeProbe() {
  const runtime = useVinboxExtensionsRuntime();
  return (
    <div>
      <span data-testid="page-count">{runtime.pages.length}</span>
      <span data-testid="page-href">{runtime.pages[0]?.href}</span>
      <span data-testid="runtime-error">
        {runtime.errors.get(extension.name)}
      </span>
    </div>
  );
}

function renderRuntime(
  moduleLoader: (source: string) => Promise<{
    activate: (host: VinboxExtensionHost) => void | (() => void);
  }>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const rendered = render(
    <QueryClientProvider client={queryClient}>
      <ActiveBackendProvider>
        <MemoryRouter>
          <VinboxExtensionsRuntimeProvider moduleLoader={moduleLoader}>
            <RuntimeProbe />
          </VinboxExtensionsRuntimeProvider>
        </MemoryRouter>
      </ActiveBackendProvider>
    </QueryClientProvider>,
  );
  return { ...rendered, queryClient };
}

describe("VinboxExtensionsRuntimeProvider", () => {
  beforeEach(() => {
    setRegisteredBackends([backend]);
    setActiveSelection({ backendId: backend.id });
    vi.spyOn(VinboxExtensionsService, "listInstalled").mockResolvedValue([
      extension,
    ]);
    vi.spyOn(VinboxExtensionsService, "fetchBundle").mockResolvedValue(
      "fixture source",
    );
    vi.spyOn(
      VinboxExtensionsService,
      "createAppBackendViewClient",
    ).mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setActiveSelection(null);
    setRegisteredBackends([]);
  });

  it("activates enabled extensions and admits declared page registrations", async () => {
    const disposeActivation = vi.fn();
    const moduleLoader = vi.fn().mockResolvedValue({
      activate: (host: VinboxExtensionHost) => {
        host.registerPage("dashboard", () => undefined);
        return disposeActivation;
      },
    });

    const rendered = renderRuntime(moduleLoader);

    await waitFor(() =>
      expect(screen.getByTestId("page-count")).toHaveTextContent("1"),
    );
    expect(screen.getByTestId("page-href")).toHaveTextContent(
      "/extensions/demo-extension/dashboard",
    );
    expect(VinboxExtensionsService.fetchBundle).toHaveBeenCalledWith(
      extension.name,
      expect.objectContaining({ id: backend.id }),
    );

    rendered.unmount();
    expect(disposeActivation).toHaveBeenCalledTimes(1);
  });

  it("re-activates an extension refreshed without a version change", async () => {
    const disposeActivation = vi.fn();
    const moduleLoader = vi.fn().mockResolvedValue({
      activate: () => disposeActivation,
    });

    const { queryClient } = renderRuntime(moduleLoader);
    await waitFor(() => expect(moduleLoader).toHaveBeenCalledTimes(1));

    vi.mocked(VinboxExtensionsService.listInstalled).mockResolvedValue([
      { ...extension, installed_at: "2026-08-02T00:00:00Z" },
    ]);
    await queryClient.invalidateQueries();

    await waitFor(() => expect(moduleLoader).toHaveBeenCalledTimes(2));
    expect(disposeActivation).toHaveBeenCalledTimes(1);
  });

  it("rejects registrations that were not declared in the manifest", async () => {
    const moduleLoader = vi.fn().mockResolvedValue({
      activate: (host: VinboxExtensionHost) => {
        host.registerPage("surprise", () => undefined);
      },
    });

    renderRuntime(moduleLoader);

    await waitFor(() =>
      expect(screen.getByTestId("runtime-error")).toHaveTextContent(
        'registered undeclared page "surprise"',
      ),
    );
    expect(screen.getByTestId("page-count")).toHaveTextContent("0");
  });

  it("degrades gracefully when the backend response has no manifest", async () => {
    vi.mocked(VinboxExtensionsService.listInstalled).mockResolvedValue([
      { ...extension, manifest: null },
    ]);
    const moduleLoader = vi.fn().mockResolvedValue({
      activate: (host: VinboxExtensionHost) => {
        host.registerPage("dashboard", () => undefined);
      },
    });

    renderRuntime(moduleLoader);

    await waitFor(() =>
      expect(screen.getByTestId("runtime-error")).toHaveTextContent(
        'registered undeclared page "dashboard"',
      ),
    );
    expect(screen.getByTestId("page-count")).toHaveTextContent("0");
  });

  it("revokes mounted app views when the selected backend changes", async () => {
    const secondBackend: Backend = {
      ...backend,
      id: "second-extension-backend",
      name: "Second extension backend",
      host: "http://127.0.0.1:9001",
    };
    setRegisteredBackends([backend, secondBackend]);
    const createSession = vi.fn().mockResolvedValue({
      url: "https://apps.example.test/app-backends/demo-extension/",
      expiresAt: "2026-09-23T16:00:00Z",
      iframeSandbox:
        "allow-forms allow-modals allow-popups allow-same-origin allow-scripts",
    });
    const revokeSession = vi.fn().mockResolvedValue(undefined);
    const disposeClient = vi.fn();
    vi.mocked(
      VinboxExtensionsService.createAppBackendViewClient,
    ).mockResolvedValue({
      createSession,
      revokeSession,
      dispose: disposeClient,
    });
    const viewContainer = document.createElement("div");
    const moduleLoader = vi.fn().mockResolvedValue({
      activate: (host: VinboxExtensionHost) => {
        host.appBackendView?.mount({ container: viewContainer });
        host.registerPage("dashboard", () => undefined);
      },
    });

    const rendered = renderRuntime(moduleLoader);

    await waitFor(() => expect(createSession).toHaveBeenCalledTimes(1));
    expect(viewContainer.querySelector("iframe")).not.toBeNull();

    setActiveSelection({ backendId: secondBackend.id });

    await waitFor(() => expect(revokeSession).toHaveBeenCalledTimes(1));
    expect(disposeClient).toHaveBeenCalledTimes(1);
    rendered.unmount();
  });

  it("disposes registrations from the previous backend before activating the next", async () => {
    const secondBackend: Backend = {
      ...backend,
      id: "second-extension-backend",
      name: "Second extension backend",
      host: "http://127.0.0.1:9001",
    };
    setRegisteredBackends([backend, secondBackend]);
    const disposeFirst = vi.fn();
    const disposeSecond = vi.fn();
    const moduleLoader = vi.fn().mockResolvedValue({
      activate: (host: VinboxExtensionHost) => {
        host.registerPage("dashboard", () => undefined);
        return host.backend.id === backend.id ? disposeFirst : disposeSecond;
      },
    });

    const rendered = renderRuntime(moduleLoader);
    await waitFor(() =>
      expect(screen.getByTestId("page-count")).toHaveTextContent("1"),
    );

    setActiveSelection({ backendId: secondBackend.id });

    await waitFor(() => expect(disposeFirst).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(VinboxExtensionsService.fetchBundle).toHaveBeenLastCalledWith(
        extension.name,
        expect.objectContaining({ id: secondBackend.id }),
      ),
    );
    expect(disposeSecond).not.toHaveBeenCalled();

    rendered.unmount();
    expect(disposeSecond).toHaveBeenCalledTimes(1);
  });
});
