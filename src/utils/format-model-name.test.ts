import { describe, expect, it } from "vitest";
import { formatModelPillLabel } from "./format-model-name";

describe("formatModelPillLabel", () => {
  it("keeps the pretty Handprint label without a free suffix unless backend marks it free", () => {
    expect(formatModelPillLabel("handprint/deepseek-v4-flash")).toBe(
      "Handprint DeepSeek V4 Flash",
    );

    expect(
      formatModelPillLabel(
        "handprint/deepseek-v4-flash",
        new Set(["handprint/deepseek-v4-flash"]),
      ),
    ).toBe("Handprint DeepSeek V4 Flash (free)");
  });
});
