import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  VINBOX_UI_CLIENT_ACTION_KIND,
  VINBOX_UI_CLIENT_TOOL_NAME,
} from "#/constants/vinbox-ui";
import {
  LAUNCH_CHILD_CONVERSATION_ACTION_KIND,
  LAUNCH_CHILD_CONVERSATION_TOOL_NAME,
} from "#/constants/child-conversation";
import { getEventContent } from "#/components/conversation-events/chat";
import {
  ActionEvent,
  ObservationEvent,
  SecurityRisk,
} from "#/types/agent-server/core";

const terminalActionEvent: ActionEvent = {
  id: "action-1",
  timestamp: new Date().toISOString(),
  source: "agent",
  thought: [{ type: "text", text: "Checking repository status." }],
  thinking_blocks: [],
  action: {
    kind: "TerminalAction",
    command: "git status",
    is_input: false,
    timeout: null,
    reset: false,
  },
  tool_name: "terminal",
  tool_call_id: "tool-1",
  tool_call: {
    id: "tool-1",
    type: "function",
    function: {
      name: "terminal",
      arguments: '{"command":"git status"}',
    },
  },
  llm_response_id: "response-1",
  security_risk: SecurityRisk.LOW,
  summary: "Check repository status",
};

const terminalObservationEvent: ObservationEvent = {
  id: "obs-1",
  timestamp: new Date().toISOString(),
  source: "environment",
  tool_name: "terminal",
  tool_call_id: "tool-1",
  action_id: "action-1",
  observation: {
    kind: "TerminalObservation",
    content: [{ type: "text", text: "On branch main" }],
    command: "git status",
    exit_code: 0,
    is_error: false,
    timeout: false,
    metadata: {
      exit_code: 0,
      pid: 1,
      username: "handprint",
      hostname: "runtime",
      prefix: "",
      suffix: "",
      working_dir: "/workspace/project/Handprint",
      py_interpreter_path: null,
    },
  },
};

describe("getEventContent", () => {
  it("uses the action summary as the full action title", () => {
    const { title } = getEventContent(terminalActionEvent);

    render(<span>{title}</span>);

    expect(screen.getByText("Check repository status")).toBeInTheDocument();
    expect(screen.queryByText("$ git status")).not.toBeInTheDocument();
  });

  it("falls back to command-based title when summary is missing", () => {
    const actionWithoutSummary = { ...terminalActionEvent, summary: undefined };
    const { title } = getEventContent(actionWithoutSummary);

    render(<span>{title}</span>);

    // Without i18n loaded, the translation key renders as the raw key
    expect(screen.getByText("ACTION_MESSAGE$RUN")).toBeInTheDocument();
    expect(
      screen.queryByText("Check repository status"),
    ).not.toBeInTheDocument();
  });

  it("ignores the agent-server fallback summary ('tool_name: {args}') and uses the action-kind title", () => {
    // The SDK's `_extract_summary` emits `f"{tool_name}: {json}"` when the
    // LLM omits a summary. That blob should not be shown as the title.
    const actionWithFallbackSummary = {
      ...terminalActionEvent,
      summary: 'terminal: {"command":"git status"}',
    };
    const { title } = getEventContent(actionWithFallbackSummary);

    render(<span>{title}</span>);

    expect(screen.getByText("ACTION_MESSAGE$RUN")).toBeInTheDocument();
    expect(
      screen.queryByText('terminal: {"command":"git status"}'),
    ).not.toBeInTheDocument();
  });

  it("ignores fallback summary on the paired observation as well", () => {
    const actionWithFallbackSummary = {
      ...terminalActionEvent,
      summary: 'terminal: {"command":"git status"}',
    };
    const { title } = getEventContent(
      terminalObservationEvent,
      actionWithFallbackSummary,
    );

    render(<span>{title}</span>);

    expect(screen.getByText("OBSERVATION_MESSAGE$RUN")).toBeInTheDocument();
    expect(
      screen.queryByText('terminal: {"command":"git status"}'),
    ).not.toBeInTheDocument();
  });

  it("renders a file view action through the file-editor visualizer", () => {
    const fileViewAction: ActionEvent = {
      id: "action-2",
      timestamp: new Date().toISOString(),
      source: "agent",
      thought: [],
      thinking_blocks: [],
      action: {
        kind: "FileEditorAction",
        command: "view",
        path: "/workspace/README.md",
        file_text: null,
        old_str: null,
        new_str: null,
        insert_line: null,
        view_range: null,
      },
      tool_name: "file_editor",
      tool_call_id: "tool-2",
      tool_call: {
        id: "tool-2",
        type: "function",
        function: {
          name: "file_editor",
          arguments: '{"command":"view","path":"/workspace/README.md"}',
        },
      },
      llm_response_id: "response-2",
      security_risk: SecurityRisk.LOW,
    };

    const { title, details } = getEventContent(fileViewAction);

    render(<span>{title}</span>);
    expect(screen.getByText("ACTION_MESSAGE$READ")).toBeInTheDocument();
    // FileEditor is now migrated to a React visualizer: details is a node that
    // renders the file-path chip rather than the old empty markdown string.
    expect(typeof details).not.toBe("string");
    render(<div>{details}</div>);
    expect(screen.getByText("/workspace/README.md")).toBeInTheDocument();
  });

  it.each([
    ["create", "OBSERVATION_MESSAGE$WRITE"],
    ["str_replace", "OBSERVATION_MESSAGE$EDIT"],
  ])(
    "titles a %s file-editor observation with %s",
    (command, expectedTitleKey) => {
      const fileEditorObservation: ObservationEvent = {
        id: "obs-2",
        timestamp: new Date().toISOString(),
        source: "environment",
        tool_name: "file_editor",
        tool_call_id: "tool-2",
        action_id: "action-2",
        observation: {
          kind: "FileEditorObservation",
          command: command as "create" | "str_replace",
          output: "",
          path: "/workspace/vinbox.md",
          prev_exist: command !== "create",
          old_content: null,
          new_content: "# Vinbox",
          error: null,
        },
      };

      const { title } = getEventContent(fileEditorObservation);

      render(<span>{title}</span>);
      expect(screen.getByText(expectedTitleKey)).toBeInTheDocument();
    },
  );

  it("shows action kind for action-like events missing tool_name/tool_call_id", () => {
    // Simulate an event that has an action object but fails the strict isActionEvent() guard
    const malformedEvent = {
      id: "action-3",
      timestamp: new Date().toISOString(),
      source: "agent" as const,
      action: { kind: "FileEditorAction" },
    };

    const { title, details } = getEventContent(malformedEvent as any);

    expect(title).toBe("FILEEDITOR");
    expect(details).toBe("");
  });

  it("reuses the action summary as the full paired observation title", () => {
    const { title } = getEventContent(
      terminalObservationEvent,
      terminalActionEvent,
    );

    render(<span>{title}</span>);

    expect(screen.getByText("Check repository status")).toBeInTheDocument();
    expect(screen.queryByText("$ git status")).not.toBeInTheDocument();
  });

  it("renders InvokeTrackAction with the track name instead of 'INVOKETRACK'", () => {
    const invokeTrackAction: ActionEvent = {
      id: "action-track",
      timestamp: new Date().toISOString(),
      source: "agent",
      thought: [],
      thinking_blocks: [],
      action: {
        kind: "InvokeTrackAction",
        name: "worktree-switch",
      },
      tool_name: "invoke_track",
      tool_call_id: "tool-track",
      tool_call: {
        id: "tool-track",
        type: "function",
        function: {
          name: "invoke_track",
          arguments: '{"name":"worktree-switch"}',
        },
      },
      llm_response_id: "response-track",
      security_risk: SecurityRisk.LOW,
    };

    const { title, details } = getEventContent(invokeTrackAction);

    render(<span>{title}</span>);
    // Without i18n loaded, the translation key renders as the raw key —
    // the important thing is that we no longer fall back to "INVOKETRACK".
    expect(screen.getByText("ACTION_MESSAGE$INVOKE_TRACK")).toBeInTheDocument();
    expect(screen.queryByText("INVOKETRACK")).not.toBeInTheDocument();
    expect(details).toContain("worktree-switch");
  });

  it("renders InvokeTrackObservation with the track name", () => {
    const invokeTrackObservation: ObservationEvent = {
      id: "obs-track",
      timestamp: new Date().toISOString(),
      source: "environment",
      tool_name: "invoke_track",
      tool_call_id: "tool-track",
      action_id: "action-track",
      observation: {
        kind: "InvokeTrackObservation",
        track_name: "worktree-switch",
        content: [{ type: "text", text: "# Track content" }],
      },
    };

    const { title, details } = getEventContent(invokeTrackObservation);

    render(<span>{title}</span>);
    expect(
      screen.getByText("OBSERVATION_MESSAGE$INVOKE_TRACK"),
    ).toBeInTheDocument();
    expect(screen.queryByText("INVOKETRACK")).not.toBeInTheDocument();
    expect(details).toContain("worktree-switch");
    expect(details).toContain("# Track content");
  });

  it("titles a TaskAction with the subagent and shows the query", () => {
    const taskAction: ActionEvent = {
      id: "act-task",
      timestamp: new Date().toISOString(),
      source: "agent",
      thought: [],
      thinking_blocks: [],
      tool_name: "task",
      tool_call_id: "tool-task",
      action: {
        kind: "TaskAction",
        prompt: "Summarize the README",
        subagent_type: "code-explorer",
      },
    } as unknown as ActionEvent;

    const { title } = getEventContent(taskAction);

    render(<span>{title}</span>);
    expect(screen.getByText("ACTION_MESSAGE$TASK")).toBeInTheDocument();
    expect(screen.queryByText("TASK")).not.toBeInTheDocument();
  });

  it("titles a TaskObservation with the subagent", () => {
    const taskObservation: ObservationEvent = {
      id: "obs-task",
      timestamp: new Date().toISOString(),
      source: "environment",
      tool_name: "task",
      tool_call_id: "tool-task",
      action_id: "act-task",
      observation: {
        kind: "TaskObservation",
        content: [{ type: "text", text: "All done." }],
        is_error: false,
        task_id: "task_00000001",
        subagent: "code-explorer",
        status: "completed",
      },
    };

    const { title } = getEventContent(taskObservation);

    render(<span>{title}</span>);
    expect(screen.getByText("OBSERVATION_MESSAGE$TASK")).toBeInTheDocument();
    // The body is rendered by the task visualizer (covered in task.test.tsx),
    // so only the title is asserted here.
  });

  it("renders VinboxUIObservation as just its acknowledgement text", () => {
    const vinboxUIObservation: ObservationEvent = {
      id: "obs-vinbox",
      timestamp: new Date().toISOString(),
      source: "environment",
      tool_name: "vinbox_ui",
      tool_call_id: "tool-vinbox",
      action_id: "action-vinbox",
      observation: {
        kind: "VinboxUIObservation",
        content: [
          {
            type: "text",
            text: "UI command 'open_tab' dispatched to the Agent Vinbox frontend.",
          },
        ],
        is_error: false,
      },
    };

    const { title, details } = getEventContent(vinboxUIObservation);

    render(<span>{title}</span>);
    expect(
      screen.getByText("OBSERVATION_MESSAGE$VINBOX_UI"),
    ).toBeInTheDocument();
    // The body is exactly the acknowledgement text, not a JSON dump.
    expect(details).toBe(
      "UI command 'open_tab' dispatched to the Agent Vinbox frontend.",
    );
  });

  it("renders client-defined Vinbox UI events like legacy events", () => {
    const vinboxUIAction: ActionEvent = {
      id: "action-vinbox-client",
      timestamp: new Date().toISOString(),
      source: "agent",
      thought: [],
      thinking_blocks: [],
      action: {
        kind: VINBOX_UI_CLIENT_ACTION_KIND,
        command: "open_tab",
        path: null,
        tab: "files",
      },
      tool_name: VINBOX_UI_CLIENT_TOOL_NAME,
      tool_call_id: "tool-vinbox-client",
      tool_call: {
        id: "tool-vinbox-client",
        type: "function",
        function: {
          name: VINBOX_UI_CLIENT_TOOL_NAME,
          arguments: '{"command":"open_tab","tab":"files"}',
        },
      },
      llm_response_id: "response-vinbox-client",
      security_risk: SecurityRisk.LOW,
      summary: "",
    };
    const vinboxUIObservation: ObservationEvent = {
      id: "obs-vinbox-client",
      timestamp: new Date().toISOString(),
      source: "environment",
      tool_name: VINBOX_UI_CLIENT_TOOL_NAME,
      tool_call_id: "tool-vinbox-client",
      action_id: "action-vinbox-client",
      observation: {
        kind: "ClientToolObservation",
        content: [{ type: "text", text: "Tool call dispatched to client." }],
        is_error: false,
      },
    };

    const actionContent = getEventContent(vinboxUIAction);
    render(<span>{actionContent.title}</span>);
    expect(screen.getByText("VINBOXUI")).toBeInTheDocument();

    const { title, details } = getEventContent(
      vinboxUIObservation,
      vinboxUIAction,
    );
    render(<span>{title}</span>);
    expect(
      screen.getByText("OBSERVATION_MESSAGE$VINBOX_UI"),
    ).toBeInTheDocument();
    expect(details).toBe(
      "UI command 'open_tab' dispatched to the Agent Vinbox frontend.",
    );
  });

  // Without the explicit mapping the default branch would surface the SDK's
  // generated discriminator ("CLIENTACTION_LAUNCH_CHILD_CONVERSATION") to users.
  it("titles the launch-child-conversation tool call and its acknowledgement", () => {
    const launchAction: ActionEvent = {
      id: "action-launch",
      timestamp: new Date().toISOString(),
      source: "agent",
      thought: [],
      thinking_blocks: [],
      action: {
        kind: LAUNCH_CHILD_CONVERSATION_ACTION_KIND,
        target: "local",
        task: "Add a regression test for the parser",
      },
      tool_name: LAUNCH_CHILD_CONVERSATION_TOOL_NAME,
      tool_call_id: "tool-launch",
      tool_call: {
        id: "tool-launch",
        type: "function",
        function: {
          name: LAUNCH_CHILD_CONVERSATION_TOOL_NAME,
          arguments: '{"target":"local","task":"Add a regression test"}',
        },
      },
      llm_response_id: "response-launch",
      security_risk: SecurityRisk.LOW,
      summary: "",
    };
    const launchObservation: ObservationEvent = {
      id: "obs-launch",
      timestamp: new Date().toISOString(),
      source: "environment",
      tool_name: LAUNCH_CHILD_CONVERSATION_TOOL_NAME,
      tool_call_id: "tool-launch",
      action_id: "action-launch",
      observation: {
        kind: "ClientToolObservation",
        content: [{ type: "text", text: "Tool call dispatched to client." }],
        is_error: false,
      },
    };

    render(<span>{getEventContent(launchAction).title}</span>);
    expect(
      screen.getByText("ACTION_MESSAGE$LAUNCH_CHILD_CONVERSATION"),
    ).toBeInTheDocument();

    render(
      <span>{getEventContent(launchObservation, launchAction).title}</span>,
    );
    expect(
      screen.getByText("OBSERVATION_MESSAGE$LAUNCH_CHILD_CONVERSATION"),
    ).toBeInTheDocument();
  });
});
