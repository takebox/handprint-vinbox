import { beforeEach, describe, expect, it, vi } from "vitest";

import ConversationService from "#/api/conversation-service/conversation-service.api";
import {
  VINBOX_UI_CLIENT_ACTION_KIND,
  VINBOX_UI_CLIENT_TOOL_NAME,
  LEGACY_VINBOX_UI_TOOL_NAME,
} from "#/constants/vinbox-ui";
import {
  handleVinboxUIAction,
  openWorkspaceFile,
  subscribeToPanelReveal,
} from "#/services/vinbox-ui";
import { useConversationStore } from "#/stores/conversation-store";
import { useFilesTabStore } from "#/stores/files-tab-store";
import type { VinboxUIAction } from "#/types/agent-server/core";
import { isVinboxUIActionEvent } from "#/types/agent-server/type-guards";
import {
  getConversationState,
  setConversationState,
} from "#/utils/conversation-local-storage";

// Helper: build a VinboxUIAction without repeating the literal `kind`
// discriminator in every test case.
function action(overrides: Partial<VinboxUIAction>): VinboxUIAction {
  return { kind: "VinboxUIAction", ...overrides } as VinboxUIAction;
}

describe("handleVinboxUIAction", () => {
  beforeEach(() => {
    localStorage.clear();
    ConversationService.setCurrentConversation(null);
    useConversationStore.setState({
      selectedTab: null,
      isRightPanelShown: false,
      hasRightPanelToggled: false,
    });
    useFilesTabStore.setState({
      selectedPath: null,
      selectedConversationId: null,
      openPaths: [],
    });
  });

  it("navigate_to_file selects the files tab, reveals the panel, and sets selectedPath", () => {
    handleVinboxUIAction(
      action({ command: "navigate_to_file", path: "docs/intro.html" }),
      "conv-1",
    );

    const conv = useConversationStore.getState();
    expect(conv.selectedTab).toBe("files");
    expect(conv.isRightPanelShown).toBe(true);
    expect(useFilesTabStore.getState().selectedPath).toBe("docs/intro.html");
    expect(useFilesTabStore.getState().selectedConversationId).toBe("conv-1");
    expect(useFilesTabStore.getState().openPaths).toEqual(["docs/intro.html"]);
  });

  it("show_preview selects the files tab and the requested path", () => {
    handleVinboxUIAction(
      action({ command: "show_preview", path: "report.html" }),
    );

    expect(useConversationStore.getState().selectedTab).toBe("files");
    expect(useFilesTabStore.getState().selectedPath).toBe("report.html");
  });

  it("open_tab switches to a valid tab without touching selectedPath", () => {
    handleVinboxUIAction(action({ command: "open_tab", tab: "terminal" }));

    expect(useConversationStore.getState().selectedTab).toBe("terminal");
    expect(useFilesTabStore.getState().selectedPath).toBeNull();
  });

  it("open_tab persists the agent's tab for the conversation, as a user tab click does", () => {
    handleVinboxUIAction(
      action({ command: "open_tab", tab: "terminal" }),
      "conv-1",
    );

    expect(getConversationState("conv-1").selectedTab).toBe("terminal");
  });

  it("asks panel-reveal subscribers to show the drawer until they unsubscribe", () => {
    const onReveal = vi.fn();
    const unsubscribe = subscribeToPanelReveal(onReveal);

    handleVinboxUIAction(
      action({ command: "open_tab", tab: "terminal" }),
      "conv-1",
    );
    expect(onReveal).toHaveBeenCalledTimes(1);

    unsubscribe();
    handleVinboxUIAction(
      action({ command: "navigate_to_file", path: "src/calc.py" }),
      "conv-1",
    );
    expect(onReveal).toHaveBeenCalledTimes(1);
  });

  it("open_tab ignores unknown tab values and surfaces a warning for debuggability", () => {
    const onReveal = vi.fn();
    const unsubscribe = subscribeToPanelReveal(onReveal);
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    try {
      handleVinboxUIAction(action({ command: "open_tab", tab: "not_a_tab" }));

      expect(useConversationStore.getState().selectedTab).toBeNull();
      expect(useConversationStore.getState().isRightPanelShown).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("not_a_tab"),
      );
      expect(onReveal).not.toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
      unsubscribe();
    }
  });

  it("open_tab routes the removed vscode tab to files", () => {
    handleVinboxUIAction(action({ command: "open_tab", tab: "vscode" }));

    expect(useConversationStore.getState().selectedTab).toBe("files");
    expect(useConversationStore.getState().isRightPanelShown).toBe(true);
    expect(useFilesTabStore.getState().selectedPath).toBeNull();
  });

  it("navigate_to_file leaves selectedPath alone when no path is supplied", () => {
    useFilesTabStore.setState({ selectedPath: "previous.txt" });

    handleVinboxUIAction(action({ command: "navigate_to_file", path: null }));

    expect(useFilesTabStore.getState().selectedPath).toBe("previous.txt");
    expect(useConversationStore.getState().selectedTab).toBe("files");
  });

  it("strips the conversation working dir from absolute host paths", () => {
    ConversationService.setCurrentConversation({
      id: "conv-abs",
      workspace: { working_dir: "/Users/me/ws" },
    } as never);

    handleVinboxUIAction(
      action({
        command: "navigate_to_file",
        path: "/Users/me/ws/agentic_ai.docx",
      }),
      "conv-abs",
    );

    expect(useFilesTabStore.getState().selectedPath).toBe("agentic_ai.docx");
  });

  it("strips a nested /workspace working dir before selecting the file", () => {
    ConversationService.setCurrentConversation({
      id: "conv-nested",
      workspace: { working_dir: "/workspace/project/packages/app" },
    } as never);

    handleVinboxUIAction(
      action({
        command: "navigate_to_file",
        path: "/workspace/project/packages/app/src/index.ts",
      }),
      "conv-nested",
    );

    expect(useFilesTabStore.getState().selectedPath).toBe("src/index.ts");
  });
});

describe("openWorkspaceFile", () => {
  beforeEach(() => {
    localStorage.clear();
    ConversationService.setCurrentConversation(null);
    useConversationStore.setState({
      selectedTab: null,
      isRightPanelShown: false,
      hasRightPanelToggled: false,
    });
    useFilesTabStore.setState({
      selectedPath: null,
      selectedConversationId: null,
      openPaths: [],
    });
  });

  it("delegates to navigate_to_file with the active conversation", () => {
    ConversationService.setCurrentConversation({
      id: "conv-1",
      workspace: { working_dir: "/Users/me/project" },
    } as never);
    setConversationState("conv-1", { selectedTab: "terminal" });

    openWorkspaceFile("/Users/me/project/test.md");

    expect(useConversationStore.getState().selectedTab).toBe("files");
    expect(useConversationStore.getState().isRightPanelShown).toBe(true);
    expect(useFilesTabStore.getState().selectedPath).toBe("test.md");
    expect(useFilesTabStore.getState().selectedConversationId).toBe("conv-1");
    expect(useFilesTabStore.getState().openPaths).toEqual(["test.md"]);
    expect(getConversationState("conv-1").selectedTab).toBe("files");
  });
});

describe("isVinboxUIActionEvent", () => {
  function makeActionEvent(overrides: Record<string, unknown> = {}) {
    return {
      id: "evt-1",
      timestamp: "2026-05-13T00:00:00Z",
      source: "agent",
      action: { kind: "VinboxUIAction" },
      tool_name: LEGACY_VINBOX_UI_TOOL_NAME,
      tool_call_id: "call-1",
      ...overrides,
    };
  }

  it.each([
    ["VinboxUIAction", LEGACY_VINBOX_UI_TOOL_NAME],
    [VINBOX_UI_CLIENT_ACTION_KIND, VINBOX_UI_CLIENT_TOOL_NAME],
  ])("returns true for a %s ActionEvent from %s", (kind, toolName) => {
    expect(
      isVinboxUIActionEvent(
        makeActionEvent({
          action: { kind, command: "open_tab" },
          tool_name: toolName,
        }) as never,
      ),
    ).toBe(true);
  });

  it("returns false when tool_name belongs to a different tool", () => {
    expect(
      isVinboxUIActionEvent(
        makeActionEvent({ tool_name: "execute_bash" }) as never,
      ),
    ).toBe(false);
  });

  it("returns false for a non-action event (no action field)", () => {
    const observationEvent = {
      id: "evt-2",
      timestamp: "2026-05-13T00:00:00Z",
      source: "environment",
      observation: { kind: "ExecuteBashObservation" },
      tool_name: LEGACY_VINBOX_UI_TOOL_NAME,
      tool_call_id: "call-1",
    };

    expect(isVinboxUIActionEvent(observationEvent as never)).toBe(false);
  });
});
