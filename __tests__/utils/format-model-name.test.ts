import { describe, expect, it } from "vitest";
import {
  FREE_MODEL_SUFFIX,
  formatModelNameForDisplay,
  formatNativeModelName,
  formatProviderModelNameForDisplay,
  isFreeHandprintModel,
} from "#/utils/format-model-name";

// DB-driven free set (sourced from the backend model list), replacing the
// previously-hardcoded free-model map.
const FREE_MODELS = new Set([
  "handprint/glm-5.2",
  "handprint/deepseek-v4-flash",
  "handprint/minimax-m2.7",
]);

describe("formatNativeModelName", () => {
  it("strips the provider route prefix", () => {
    expect(formatNativeModelName("juglow/haijun-codtral")).toBe(
      "haijun-codtral",
    );
    expect(formatNativeModelName("openai/gpt-4o")).toBe("gpt-4o");
  });

  it("treats no model as free without a free-models set", () => {
    expect(formatModelNameForDisplay("handprint/glm-5.2")).toBe(
      "handprint/glm-5.2",
    );
    expect(isFreeHandprintModel("handprint/glm-5.2")).toBe(false);
  });

  it("labels only DB-flagged Handprint free-model routes as free", () => {
    for (const fullModel of FREE_MODELS) {
      const name = fullModel.slice("handprint/".length);
      expect(formatModelNameForDisplay(fullModel, FREE_MODELS)).toBe(
        `${fullModel}${FREE_MODEL_SUFFIX}`,
      );
      expect(
        formatProviderModelNameForDisplay("handprint", name, FREE_MODELS),
      ).toBe(`${name}${FREE_MODEL_SUFFIX}`);
      expect(isFreeHandprintModel(fullModel, FREE_MODELS)).toBe(true);
    }

    expect(formatModelNameForDisplay("openai/glm-5.2", FREE_MODELS)).toBe(
      "openai/glm-5.2",
    );
    expect(
      formatProviderModelNameForDisplay("openai", "glm-5.2", FREE_MODELS),
    ).toBe("glm-5.2");
    expect(isFreeHandprintModel("openai/glm-5.2", FREE_MODELS)).toBe(false);
  });

  it("keeps the free suffix on native conversation chips", () => {
    expect(formatNativeModelName("handprint/glm-5.2", FREE_MODELS)).toBe(
      `glm-5.2${FREE_MODEL_SUFFIX}`,
    );
    expect(
      formatNativeModelName("handprint/deepseek-v4-flash", FREE_MODELS),
    ).toBe(`deepseek-v4-flash${FREE_MODEL_SUFFIX}`);
  });

  it("strips nested routing prefixes to the last segment", () => {
    expect(formatNativeModelName("litellm_proxy/openai/gpt-4o")).toBe("gpt-4o");
  });

  it("returns the original string when there is no prefix", () => {
    expect(formatNativeModelName("gpt-4o")).toBe("gpt-4o");
  });

  it("falls back to the original string instead of returning empty (trailing slash)", () => {
    expect(formatNativeModelName("openai/")).toBe("openai/");
  });

  it("returns null for empty / nullish input", () => {
    expect(formatNativeModelName("")).toBeNull();
    expect(formatNativeModelName(null)).toBeNull();
    expect(formatNativeModelName(undefined)).toBeNull();
  });
});
