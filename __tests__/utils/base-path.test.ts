import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAgentVinboxPath,
  buildAgentVinboxUrl,
  getAgentVinboxBasePath,
  getAgentVinboxBaseUrl,
} from "#/utils/base-path";

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as unknown as Record<string, unknown>)
    .__AGENT_VINBOX_BASE_PATH__;
});

describe("Agent Vinbox base path", () => {
  it("defaults to root paths", () => {
    expect(getAgentVinboxBasePath()).toBe("");
    expect(buildAgentVinboxPath("/settings")).toBe("/settings");
  });

  it("uses the build-time VITE_BASE_PATH when configured", () => {
    vi.stubEnv("VITE_BASE_PATH", "/vinbox/");

    expect(getAgentVinboxBasePath()).toBe("/vinbox");
    expect(buildAgentVinboxPath("/settings")).toBe("/vinbox/settings");
  });

  it("falls back to the runtime-injected base path", () => {
    vi.stubEnv("VITE_BASE_PATH", "");
    (window as unknown as Record<string, unknown>).__AGENT_VINBOX_BASE_PATH__ =
      "vinbox";

    expect(getAgentVinboxBasePath()).toBe("/vinbox");
    expect(buildAgentVinboxPath("settings")).toBe("/vinbox/settings");
  });

  it("leaves paths that carry their own origin untouched", () => {
    vi.stubEnv("VITE_BASE_PATH", "/vinbox");

    // An absolute or protocol-relative path addresses another document; only
    // app-relative paths belong under the Vinbox mount point.
    expect(buildAgentVinboxPath("https://example.com/settings")).toBe(
      "https://example.com/settings",
    );
    expect(buildAgentVinboxPath("//example.com/settings")).toBe(
      "//example.com/settings",
    );
  });
});

describe("Agent Vinbox absolute URLs", () => {
  it("joins an app-relative path onto the current origin", () => {
    expect(buildAgentVinboxUrl("/shared/conversations/abc")).toBe(
      `${window.location.origin}/shared/conversations/abc`,
    );
  });

  it("carries the base path so the URL stays inside Vinbox", () => {
    vi.stubEnv("VITE_BASE_PATH", "/vinbox");

    expect(buildAgentVinboxUrl("/shared/conversations/abc")).toBe(
      `${window.location.origin}/vinbox/shared/conversations/abc`,
    );
  });

  it("uses an explicit origin, such as a cloud backend host", () => {
    vi.stubEnv("VITE_BASE_PATH", "/vinbox");

    expect(
      buildAgentVinboxUrl(
        "/shared/conversations/abc",
        "https://app.example.com",
      ),
    ).toBe("https://app.example.com/vinbox/shared/conversations/abc");
  });

  it("does not double-prefix an origin that already ends in the base path", () => {
    vi.stubEnv("VITE_BASE_PATH", "/vinbox");

    expect(
      buildAgentVinboxUrl("/settings", "https://app.example.com/vinbox"),
    ).toBe("https://app.example.com/vinbox/settings");
  });

  it("returns a bare path when there is no origin available", () => {
    expect(buildAgentVinboxUrl("/settings", "")).toBe("/settings");
  });
});

describe("Agent Vinbox base URL", () => {
  it("is the plain origin when Vinbox is mounted at the root", () => {
    expect(getAgentVinboxBaseUrl()).toBe(window.location.origin);
  });

  it("includes the base path, without a trailing slash", () => {
    vi.stubEnv("VITE_BASE_PATH", "/vinbox");

    expect(getAgentVinboxBaseUrl()).toBe(`${window.location.origin}/vinbox`);
  });

  it("does not add the base path twice when the origin already has it", () => {
    vi.stubEnv("VITE_BASE_PATH", "/vinbox");

    expect(getAgentVinboxBaseUrl("https://app.example.com/vinbox")).toBe(
      "https://app.example.com/vinbox",
    );
  });

  it("is the base an exported conversation path appends to", () => {
    vi.stubEnv("VITE_BASE_PATH", "/vinbox");

    expect(`${getAgentVinboxBaseUrl()}/conversations/abc`).toBe(
      `${window.location.origin}/vinbox/conversations/abc`,
    );
  });
});
