import { describe, expect, it } from "vitest";
import type { PluginSpec } from "#/api/conversation-service/agent-server-conversation-service.types";
import {
  getPluginDisplayName,
  getPluginSourceLabel,
  isLocalPluginSource,
  pluginReferenceKey,
} from "#/utils/plugin-display";

function buildPlugin(overrides: Partial<PluginSpec> = {}): PluginSpec {
  return {
    source: "github:HandPrint-AI/extensions",
    ref: null,
    repo_path: null,
    parameters: null,
    name: null,
    ...overrides,
  };
}

describe("getPluginDisplayName", () => {
  it("prefers an explicit display name over repository coordinates", () => {
    expect(
      getPluginDisplayName(
        buildPlugin({
          name: "Weather Plugin",
          repo_path: "plugins/weather",
          source: "github:example/fallback",
        }),
      ),
    ).toBe("Weather Plugin");
  });

  it.each([
    ["plugins/weather", "weather"],
    ["/plugins/weather/", "weather"],
    ["///plugins///weather///", "weather"],
  ])("uses the final non-empty repo-path segment from %s", (repoPath, name) => {
    expect(getPluginDisplayName(buildPlugin({ repo_path: repoPath }))).toBe(
      name,
    );
  });

  it.each([
    ["github:HandPrint-AI/extensions", "Handprint/extensions"],
    ["github:", ""],
    ["https://github.com/HandPrint-AI/extensions.git", "extensions"],
    ["https://github.com/HandPrint-AI/extensions", "extensions"],
    ["git+ssh://github.com/HandPrint-AI/extensions.git", "extensions"],
    ["git@github.com:HandPrint-AI/extensions.git", "extensions"],
    ["Handprint/extensions.git", "extensions"],
    ["Handprint/extensions.GIT", "extensions.GIT"],
    ["Handprint/extensions.git.backup", "extensions.git.backup"],
    ["local-plugin", "local-plugin"],
    ["local-plugin.git", "local-plugin.git"],
    ["", ""],
  ])("derives %j from source %j", (source, expectedName) => {
    expect(getPluginDisplayName(buildPlugin({ source }))).toBe(expectedName);
  });

  it.each(["https://github.com/HandPrint-AI/extensions/", "/", "///"])(
    "falls back to the full source when %j ends in an empty segment",
    (source) => {
      expect(getPluginDisplayName(buildPlugin({ source }))).toBe(source);
    },
  );

  it("falls through empty names and empty repo paths", () => {
    expect(
      getPluginDisplayName(
        buildPlugin({
          name: "",
          repo_path: "",
          source: "bare-source",
        }),
      ),
    ).toBe("bare-source");
  });

  it("falls through repo paths containing only separators", () => {
    expect(
      getPluginDisplayName(
        buildPlugin({
          repo_path: "///",
          source: "github:HandPrint-AI/extensions",
        }),
      ),
    ).toBe("Handprint/extensions");
  });
});

describe("isLocalPluginSource", () => {
  it.each([
    "github:HandPrint-AI/extensions",
    "github:",
    "https://github.com/HandPrint-AI/extensions.git",
    "HTTP://github.com/HandPrint-AI/extensions.git",
    "git+ssh://github.com/HandPrint-AI/extensions.git",
    "ssh://git@github.com/HandPrint-AI/extensions.git",
    "file:///tmp/local-plugin",
    "a://host/repository",
    "z9+.-://host/repository",
  ])("classifies the remote coordinate %j as non-local", (source) => {
    expect(isLocalPluginSource(buildPlugin({ source }))).toBe(false);
  });

  it.each([
    "local",
    "/Users/me/plugins/weather",
    "./plugins/weather",
    "../plugins/weather",
    "bare-plugin",
    "",
    "github:HandPrint-AI/extensions",
    "1https://github.com/HandPrint-AI/extensions",
    "git_ssh://github.com/HandPrint-AI/extensions",
    "ssh:git@github.com/HandPrint-AI/extensions",
  ])("classifies the non-URL coordinate %j as local", (source) => {
    expect(isLocalPluginSource(buildPlugin({ source }))).toBe(true);
  });
});

describe("getPluginSourceLabel", () => {
  it("removes the GitHub prefix and appends a ref", () => {
    expect(
      getPluginSourceLabel(
        buildPlugin({
          source: "github:HandPrint-AI/extensions",
          ref: "main",
        }),
      ),
    ).toBe("Handprint/extensions @ main");
  });

  it.each([undefined, null, ""])("omits a missing or empty ref (%j)", (ref) => {
    expect(
      getPluginSourceLabel(
        buildPlugin({ source: "github:HandPrint-AI/extensions", ref }),
      ),
    ).toBe("Handprint/extensions");
  });

  it("preserves non-GitHub source coordinates", () => {
    expect(
      getPluginSourceLabel(
        buildPlugin({
          source: "https://github.com/HandPrint-AI/extensions.git",
          ref: "v1.2.3",
        }),
      ),
    ).toBe("https://github.com/HandPrint-AI/extensions.git @ v1.2.3");
  });

  it("only removes github: when it prefixes the source coordinate", () => {
    expect(
      getPluginSourceLabel(
        buildPlugin({
          source: "mirror:github:HandPrint-AI/extensions",
          ref: "main",
        }),
      ),
    ).toBe("mirror:github:HandPrint-AI/extensions @ main");
  });

  it.each([
    ["github:", "main", " @ main"],
    ["", "main", " @ main"],
    ["bare-plugin", "0", "bare-plugin @ 0"],
  ])(
    "preserves boundary source and ref strings for %j at %j",
    (source, ref, expectedLabel) => {
      expect(getPluginSourceLabel(buildPlugin({ source, ref }))).toBe(
        expectedLabel,
      );
    },
  );
});

describe("pluginReferenceKey", () => {
  it("joins all plugin coordinates in a stable order", () => {
    expect(
      pluginReferenceKey(
        buildPlugin({
          source: "github:HandPrint-AI/extensions",
          ref: "main",
          repo_path: "plugins/weather/",
        }),
      ),
    ).toBe("github:HandPrint-AI/extensions main plugins/weather/");
  });

  it("normalizes null, undefined, and empty optional coordinates", () => {
    const withoutOptionals = pluginReferenceKey(
      buildPlugin({ ref: undefined, repo_path: undefined }),
    );

    expect(withoutOptionals).toBe("github:HandPrint-AI/extensions  ");
    expect(
      pluginReferenceKey(buildPlugin({ ref: null, repo_path: null })),
    ).toBe(withoutOptionals);
    expect(pluginReferenceKey(buildPlugin({ ref: "", repo_path: "" }))).toBe(
      withoutOptionals,
    );
  });

  it("ignores display-only data and parameters", () => {
    const coordinates = {
      source: "github:HandPrint-AI/extensions",
      ref: "main",
      repo_path: "plugins/weather",
    };

    expect(
      pluginReferenceKey(
        buildPlugin({
          ...coordinates,
          name: "Weather",
          parameters: { unit: "celsius" },
        }),
      ),
    ).toBe(
      pluginReferenceKey(
        buildPlugin({
          ...coordinates,
          name: "Renamed Weather",
          parameters: { unit: "fahrenheit" },
        }),
      ),
    );
  });

  it("changes when any coordinate changes", () => {
    const keys = [
      buildPlugin({ source: "github:one/plugin", ref: "main" }),
      buildPlugin({ source: "github:two/plugin", ref: "main" }),
      buildPlugin({ source: "github:one/plugin", ref: "next" }),
      buildPlugin({
        source: "github:one/plugin",
        ref: "main",
        repo_path: "plugins/child",
      }),
    ].map(pluginReferenceKey);

    expect(new Set(keys).size).toBe(keys.length);
  });

  it("does not trim coordinate boundary strings", () => {
    expect(
      pluginReferenceKey(
        buildPlugin({ source: " source ", ref: " ref ", repo_path: " path " }),
      ),
    ).toBe(" source   ref   path ");
    expect(pluginReferenceKey(buildPlugin({ source: "" }))).toBe("  ");
  });
});
