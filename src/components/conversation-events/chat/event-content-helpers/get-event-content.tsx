import { Trans } from "react-i18next";
import React from "react";
import { VINBOX_UI_CLIENT_TOOL_NAME } from "#/constants/vinbox-ui";
import { LAUNCH_CHILD_CONVERSATION_TOOL_NAME } from "#/constants/child-conversation";
import {
  HandprintEvent,
  ObservationEvent,
  ActionEvent,
} from "#/types/agent-server/core";
import {
  isActionEvent,
  isObservationEvent,
  isACPToolCallEvent,
  isVinboxUIActionEvent,
} from "#/types/agent-server/type-guards";
import { MonoComponent } from "../../../features/chat/mono-component";
import { PathComponent } from "../../../features/chat/path-component";
import { getActionContent } from "./get-action-content";
import { getObservationContent } from "./get-observation-content";
import {
  getACPToolCallContent,
  getACPToolCallTitleKey,
  stripRedundantTitlePrefix,
} from "./get-acp-tool-call-content";
import { TaskTrackingObservationContent } from "../task-tracking/task-tracking-observation-content";
import { TaskTrackerObservation } from "#/types/agent-server/core/base/observation";
import { TrackReadyEvent, isTrackReadyEvent } from "./create-track-ready-event";
import { resolveVisualizerBody } from "../../../features/chat/tool-visualizers/dispatcher";
import i18n from "#/i18n";
import { I18nKey } from "#/i18n/declaration";
import {
  getActionEventTitleDescriptor,
  getActionSummaryTitle,
  trimEventTitleText,
  type EventTitleDescriptor,
} from "./get-action-event-title";

// Helper function to create title from translation key
const createTitleFromKey = (
  key: string,
  values: Readonly<Record<string, unknown>>,
): React.ReactNode => {
  if (!i18n.exists(key)) {
    return key;
  }

  return (
    <Trans
      ns="handprint"
      i18nKey={key}
      values={values}
      components={{
        path: <PathComponent />,
        cmd: <MonoComponent />,
      }}
    />
  );
};

const renderTitleDescriptor = (
  descriptor: EventTitleDescriptor,
): React.ReactNode =>
  descriptor.kind === "text"
    ? descriptor.text
    : createTitleFromKey(descriptor.key, descriptor.values);

const getNonEmptyString = (
  value: unknown,
  maxLength?: number,
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  return maxLength ? trimEventTitleText(trimmed, maxLength) : trimmed;
};

const getVisionInspectActionTitle = (
  event: ActionEvent,
): React.ReactNode | null => {
  if (event.tool_name !== "inspect_image_with_vision") {
    return null;
  }

  const action = event.action as unknown as Record<string, unknown>;
  const profileName = getNonEmptyString(action.profile_name);

  return profileName
    ? `Describing image with ${profileName}`
    : "Describing image with auxiliary vision LLM";
};

const getVisionInspectObservationTitle = (
  event: ObservationEvent,
  correspondingAction?: ActionEvent,
): React.ReactNode | null => {
  const actionToolName = correspondingAction?.tool_name;
  const observation = event.observation as unknown as Record<string, unknown>;
  const observationToolName = getNonEmptyString(observation.tool_name);

  if (
    actionToolName !== "inspect_image_with_vision" &&
    observationToolName !== "inspect_image_with_vision" &&
    String(event.observation.kind) !== "VisionInspectObservation"
  ) {
    return null;
  }

  const action = (correspondingAction?.action ?? {}) as unknown as Record<
    string,
    unknown
  >;
  const label =
    getNonEmptyString(action.profile_name) ??
    getNonEmptyString(observation.profile_name) ??
    getNonEmptyString(observation.base_url, 80) ??
    getNonEmptyString(observation.endpoint, 80) ??
    getNonEmptyString(observation.model, 80);

  return label
    ? `Describing image with ${label}`
    : "Describing image with auxiliary vision LLM";
};

// Action Event Processing
const getActionEventTitle = (event: HandprintEvent): React.ReactNode => {
  // Early return if not an action event
  if (!isActionEvent(event)) {
    return "";
  }

  const visionInspectTitle = getVisionInspectActionTitle(event);
  if (visionInspectTitle) {
    return visionInspectTitle;
  }

  return renderTitleDescriptor(getActionEventTitleDescriptor(event));
};

// Observation Event Processing
const getObservationEventTitle = (
  event: HandprintEvent,
  correspondingAction?: ActionEvent,
): React.ReactNode => {
  // Early return if not an observation event
  if (!isObservationEvent(event)) {
    return "";
  }

  const visionInspectObservationTitle = getVisionInspectObservationTitle(
    event,
    correspondingAction,
  );
  if (visionInspectObservationTitle) {
    return visionInspectObservationTitle;
  }

  if (correspondingAction) {
    const visionInspectTitle = getVisionInspectActionTitle(correspondingAction);
    if (visionInspectTitle) {
      return visionInspectTitle;
    }

    const summaryTitle = getActionSummaryTitle(correspondingAction);
    if (summaryTitle) {
      return summaryTitle;
    }
  }

  const observationType = event.observation.kind;
  let observationKey = "";
  let observationValues: Record<string, unknown> = {};

  switch (observationType) {
    case "ExecuteBashObservation":
    case "TerminalObservation":
      observationKey = "OBSERVATION_MESSAGE$RUN";
      observationValues = {
        command: event.observation.command
          ? trimEventTitleText(event.observation.command, 80)
          : "",
      };
      break;
    case "FileEditorObservation":
    case "StrReplaceEditorObservation":
      if (event.observation.command === "view") {
        observationKey = "OBSERVATION_MESSAGE$READ";
      } else if (event.observation.command === "create") {
        observationKey = "OBSERVATION_MESSAGE$WRITE";
      } else {
        observationKey = "OBSERVATION_MESSAGE$EDIT";
      }
      observationValues = {
        path: event.observation.path || "",
      };
      break;
    case "MCPToolObservation":
      observationKey = "OBSERVATION_MESSAGE$MCP";
      observationValues = {
        mcp_tool_name: event.observation.tool_name,
      };
      break;
    case "InvokeTrackObservation":
      observationKey = "OBSERVATION_MESSAGE$INVOKE_TRACK";
      observationValues = {
        name: event.observation.track_name,
      };
      break;
    case "TaskObservation":
      observationKey = "OBSERVATION_MESSAGE$TASK";
      observationValues = {
        name: event.observation.subagent,
      };
      break;
    case "VinboxUIObservation":
      observationKey = "OBSERVATION_MESSAGE$VINBOX_UI";
      break;
    case "ClientToolObservation":
      if (event.tool_name === VINBOX_UI_CLIENT_TOOL_NAME) {
        observationKey = "OBSERVATION_MESSAGE$VINBOX_UI";
        break;
      }
      if (event.tool_name === LAUNCH_CHILD_CONVERSATION_TOOL_NAME) {
        observationKey = "OBSERVATION_MESSAGE$LAUNCH_CHILD_CONVERSATION";
        break;
      }
      return observationType.replace("Observation", "").toUpperCase();
    case "SwitchLLMObservation":
      observationKey = event.observation.is_error
        ? "MODEL$SWITCH_FAILED"
        : "MODEL$SWITCHED_TO_PROFILE";
      observationValues = {
        name: event.observation.profile_name,
      };
      break;
    case "ClassifyAndSwitchLLMObservation":
      observationKey = event.observation.is_error
        ? "MODEL$SWITCH_FAILED"
        : "MODEL$SWITCHED_TO_PROFILE";
      observationValues = {
        name: event.observation.model,
      };
      break;
    case "BrowserObservation":
      observationKey = "OBSERVATION_MESSAGE$BROWSE";
      break;
    case "TaskTrackerObservation": {
      const { command } = event.observation;
      if (command === "plan") {
        observationKey = "OBSERVATION_MESSAGE$TASK_TRACKING_PLAN";
      } else {
        // command === "view"
        observationKey = "OBSERVATION_MESSAGE$TASK_TRACKING_VIEW";
      }
      break;
    }
    case "ThinkObservation":
      observationKey = "OBSERVATION_MESSAGE$THINK";
      break;
    case "GlobObservation":
      observationKey = "OBSERVATION_MESSAGE$GLOB";
      observationValues = {
        pattern: event.observation.pattern
          ? trimEventTitleText(event.observation.pattern, 50)
          : "",
      };
      break;
    case "GrepObservation":
      observationKey = "OBSERVATION_MESSAGE$GREP";
      observationValues = {
        pattern: event.observation.pattern
          ? trimEventTitleText(event.observation.pattern, 50)
          : "",
      };
      break;
    default:
      // For unknown observations, use the type name
      return observationType.replace("Observation", "").toUpperCase();
  }

  if (observationKey) {
    return createTitleFromKey(observationKey, observationValues);
  }

  return observationType;
};

const getVinboxUIClientObservationContent = (
  event: ObservationEvent,
  correspondingAction?: ActionEvent,
): string | null => {
  if (
    event.observation.kind !== "ClientToolObservation" ||
    event.tool_name !== VINBOX_UI_CLIENT_TOOL_NAME ||
    !correspondingAction ||
    !isVinboxUIActionEvent(correspondingAction)
  ) {
    return null;
  }

  return `UI command '${correspondingAction.action.command}' dispatched to the Agent Vinbox frontend.`;
};

export const getEventContent = (
  event: HandprintEvent | TrackReadyEvent,
  correspondingAction?: ActionEvent,
) => {
  let title: React.ReactNode = "";
  let details: string | React.ReactNode = "";

  // Handle Track Ready events first
  if (isTrackReadyEvent(event)) {
    // Use translation key if available, otherwise use "TRACK READY"
    const trackReadyKey = "OBSERVATION_MESSAGE$TRACK_READY";
    if (i18n.exists(trackReadyKey)) {
      title = createTitleFromKey(trackReadyKey, {});
    } else {
      title = "Track Ready";
    }
    details = event._trackReadyContent;
  } else if (isActionEvent(event)) {
    title = getActionEventTitle(event);
    // Per-tool React visualizer when one is registered; markdown otherwise.
    details = resolveVisualizerBody(event) ?? getActionContent(event);
  } else if (isObservationEvent(event)) {
    title = getObservationEventTitle(event, correspondingAction);

    // For TaskTrackerObservation, use React component instead of markdown
    if (event.observation.kind === "TaskTrackerObservation") {
      details = (
        <TaskTrackingObservationContent
          event={event as ObservationEvent<TaskTrackerObservation>}
        />
      );
    } else {
      details =
        getVinboxUIClientObservationContent(event, correspondingAction) ??
        resolveVisualizerBody(event, correspondingAction) ??
        getObservationContent(event);
    }
  } else if (isACPToolCallEvent(event)) {
    // ACP sub-agent tool calls reuse the same card shape as observations:
    // title is "Running/Editing/Reading …" via a translation key that
    // mirrors ACTION_MESSAGE$RUN etc.; details are markdown built from
    // raw_input + raw_output the same way getTerminalObservationContent
    // builds "Command: / Output:" blocks.
    title = createTitleFromKey(getACPToolCallTitleKey(event), {
      // Strip a redundant verb prefix the ACP server may have inlined
      // (Haijun Code emits ``"Read /path"`` for a read tool; combined
      // with the ``"Reading <cmd>{{title}}</cmd>"`` template that lands
      // as ``"Reading Read /path"``). See ``stripRedundantTitlePrefix``.
      title: stripRedundantTitlePrefix(event),
    });
    details = getACPToolCallContent(event);
  } else if (
    // Lenient fallback for action-like events that fail the strict isActionEvent() guard
    // (e.g., missing tool_name or tool_call_id). Extract a title from the action kind
    // so the UI shows something meaningful instead of "Unknown event".
    event.source === "agent" &&
    "action" in event &&
    event.action !== null &&
    typeof event.action === "object" &&
    "kind" in event.action &&
    typeof event.action.kind === "string"
  ) {
    title = String(event.action.kind).replace("Action", "").toUpperCase();
  }

  return {
    title: title || i18n.t(I18nKey.EVENT$UNKNOWN_EVENT),
    details,
  };
};
