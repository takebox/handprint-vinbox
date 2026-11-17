import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import VinboxExtensionsService from "#/api/vinbox-extensions-service";
import type { InstalledVinboxExtensionInfo } from "#/types/vinbox-extension";
import { VinboxExtensionIcon } from "./vinbox-extension-icon";

function makeExtension(icon?: string): InstalledVinboxExtensionInfo {
  return {
    name: "demo-extension",
    version: "0.1.0",
    enabled: true,
    source: "github:example/demo",
    installed_at: "2026-08-01T00:00:00Z",
    install_path: "/tmp/demo-extension",
    manifest: {
      schema_version: 1,
      name: "demo-extension",
      version: "0.1.0",
      entrypoint: "dist/extension.js",
      icon,
    },
  };
}

function renderIcon(icon?: string) {
  const queryClient = new QueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <VinboxExtensionIcon extension={makeExtension(icon)} size={18} />
    </QueryClientProvider>,
  );
}

describe("VinboxExtensionIcon", () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => "blob:icon");
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the default icon without fetching when no icon is declared", () => {
    const fetchIcon = vi.spyOn(VinboxExtensionsService, "fetchIcon");

    renderIcon();

    expect(
      screen.getByTestId("vinbox-extension-default-icon"),
    ).toBeInTheDocument();
    expect(fetchIcon).not.toHaveBeenCalled();
  });

  it("renders the fetched icon and revokes its object URL on unmount", async () => {
    vi.spyOn(VinboxExtensionsService, "fetchIcon").mockResolvedValue(
      new Blob(["<svg/>"], { type: "image/svg+xml" }),
    );

    const { unmount } = renderIcon("assets/icon.svg");

    expect(await screen.findByTestId("vinbox-extension-icon")).toHaveAttribute(
      "src",
      "blob:icon",
    );
    expect(VinboxExtensionsService.fetchIcon).toHaveBeenCalledWith(
      "demo-extension",
    );
    unmount();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:icon");
  });

  it("keeps the default icon when the backend cannot serve the icon", async () => {
    vi.spyOn(VinboxExtensionsService, "fetchIcon").mockRejectedValue(
      new Error("404"),
    );

    renderIcon("assets/icon.svg");

    await vi.waitFor(() =>
      expect(VinboxExtensionsService.fetchIcon).toHaveBeenCalled(),
    );
    expect(
      screen.getByTestId("vinbox-extension-default-icon"),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("vinbox-extension-icon")).toBeNull();
  });
});
