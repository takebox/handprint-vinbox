import { describe, expect, it } from "vitest";
import {
  assertVinboxExtensionModule,
  InvalidVinboxExtensionModuleError,
} from "#/extensions/vinbox-extension-module-loader";

describe("assertVinboxExtensionModule", () => {
  it("accepts a module namespace with an activate export", () => {
    expect(() =>
      assertVinboxExtensionModule({ activate: () => undefined }),
    ).not.toThrow();
  });

  it("rejects modules that do not implement the host lifecycle", () => {
    expect(() => assertVinboxExtensionModule({ default: {} })).toThrow(
      InvalidVinboxExtensionModuleError,
    );
  });
});
