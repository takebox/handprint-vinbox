import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";

// The wrapper is a thin positional adapter over the base mutation; the inline
// message, metadata persist, and error reporting all live in the mutation
// itself (see use-switch-llm-profile.test.tsx) so they survive the switcher
// menu unmounting on select.
const switchMutateMock = vi.fn();
vi.mock("#/hooks/mutation/use-switch-llm-profile", () => ({
  useSwitchLlmProfile: () => ({ mutate: switchMutateMock, isPending: false }),
}));

import { useSwitchLlmProfileAndLog } from "#/hooks/mutation/use-switch-llm-profile-and-log";

describe("useSwitchLlmProfileAndLog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps positional args to the base mutation for the per-conversation path", () => {
    const { result } = renderHook(() => useSwitchLlmProfileAndLog());
    result.current.switchAndLog("conv-1", "haijun-codtral");

    expect(switchMutateMock).toHaveBeenCalledWith({
      conversationId: "conv-1",
      profileName: "haijun-codtral",
    });
  });

  it("passes a null conversationId through for the home-page activate path", () => {
    const { result } = renderHook(() => useSwitchLlmProfileAndLog());
    result.current.switchAndLog(null, "haijun-codtral");

    expect(switchMutateMock).toHaveBeenCalledWith({
      conversationId: null,
      profileName: "haijun-codtral",
    });
  });
});
