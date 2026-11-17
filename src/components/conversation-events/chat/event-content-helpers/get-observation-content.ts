import { VINBOX_UI_CLIENT_TOOL_NAME } from "#/constants/vinbox-ui";
import { ObservationEvent } from "#/types/agent-server/core";
import { getObservationResult } from "./get-observation-result";
import { getDefaultEventContent, MAX_CONTENT_LENGTH } from "./shared";
import i18n from "#/i18n";
import { I18nKey } from "#/i18n/declaration";
import {
  MCPToolObservation,
  FinishObservation,
  ThinkObservation,
  BrowserObservation,
  ExecuteBashObservation,
  TerminalObservation,
  FileEditorObservation,
  StrReplaceEditorObservation,
  TaskTrackerObservation,
  GlobObservation,
  GrepObservation,
  InvokeTrackObservation,
  VinboxUIObservation,
  SwitchLLMObservation,
  ClassifyAndSwitchLLMObservation,
} from "#/types/agent-server/core/base/observation";

// File Editor Observations
const getFileEditorObservationContent = (
  event: ObservationEvent<FileEditorObservation | StrReplaceEditorObservation>,
): string => {
  const { observation } = event;

  if (observation.error) {
    return `**Error:**\n${observation.error}`;
  }

  // Extract text content from the observation if it exists
  const textContent =
    "content" in observation && Array.isArray(observation.content)
      ? observation.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n")
      : null;

  const successMessage = getObservationResult(event) === "success";

  // For view commands or successful edits with content changes, format as code block
  if (
    (successMessage &&
      "old_content" in observation &&
      "new_content" in observation &&
      observation.old_content &&
      observation.new_content) ||
    observation.command === "view"
  ) {
    // Prefer content over output for view commands, fallback to output if content is not available
    const displayContent = textContent || observation.output;
    return `\`\`\`\n${displayContent}\n\`\`\``;
  }

  // For other commands, prefer content if available, otherwise use output
  return textContent || observation.output;
};

// Command Observations
const getTerminalObservationContent = (
  event: ObservationEvent<ExecuteBashObservation | TerminalObservation>,
): string => {
  const { observation } = event;

  // Extract text content from the observation
  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  let content = textContent || "";

  if (content.length > MAX_CONTENT_LENGTH) {
    content = `${content.slice(0, MAX_CONTENT_LENGTH)}...`;
  }

  // Build the output string
  let output = "";

  // Display the command if available
  if (observation.command) {
    output += `Command: \`${observation.command}\`\n\n`;
  }

  // Display the output
  output += `Output:\n\`\`\`sh\n${content.trim() || i18n.t(I18nKey.OBSERVATION$COMMAND_NO_OUTPUT)}\n\`\`\``;

  return output;
};

// Tool Observations
const getBrowserObservationContent = (
  event: ObservationEvent<BrowserObservation>,
): string => {
  const { observation } = event;

  // Extract text content from the observation
  const textContent =
    "content" in observation && Array.isArray(observation.content)
      ? observation.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("\n")
      : observation.output || "";

  let contentDetails = "";

  if (observation.error) {
    contentDetails += `**Error:**\n${observation.error}`;
  } else if (textContent) {
    contentDetails += `**Output:**\n${textContent}`;
  } else {
    contentDetails += "Browser action completed successfully.";
  }

  if (contentDetails.length > MAX_CONTENT_LENGTH) {
    contentDetails = `${contentDetails.slice(0, MAX_CONTENT_LENGTH)}...(truncated)`;
  }

  return contentDetails;
};

const getMCPToolObservationContent = (
  event: ObservationEvent<MCPToolObservation>,
): string => {
  const { observation } = event;

  // Extract text content from the observation
  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  let content = `**Tool:** ${observation.tool_name}\n\n`;

  if (observation.is_error) {
    content += `**Error:**\n${textContent}`;
  } else {
    content += `**Result:**\n${textContent}`;
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    content = `${content.slice(0, MAX_CONTENT_LENGTH)}...`;
  }

  return content;
};

// Invoke-track observations
const getInvokeTrackObservationContent = (
  event: ObservationEvent<InvokeTrackObservation>,
): string => {
  const { observation } = event;

  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  const header = observation.track_name
    ? `**Track:** \`${observation.track_name}\`\n\n`
    : "";
  const body = observation.is_error
    ? `**Error:**\n${textContent}`
    : textContent;

  let content = `${header}${body}`;
  if (content.length > MAX_CONTENT_LENGTH) {
    content = `${content.slice(0, MAX_CONTENT_LENGTH)}...(truncated)`;
  }
  return content;
};

// Vinbox UI observations — just surface the acknowledgement text.
const getVinboxUIObservationContent = (
  event: ObservationEvent<VinboxUIObservation>,
): string =>
  event.observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

const getSwitchLLMObservationContent = (
  event: ObservationEvent<SwitchLLMObservation>,
): string => {
  const { observation } = event;

  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  if (observation.is_error) {
    return textContent
      ? `**Error:**\n${textContent}`
      : `**Error:**\nFailed to switch LLM profile \`${observation.profile_name}\`.`;
  }

  const parts = [`**Profile:** \`${observation.profile_name}\``];
  if (observation.active_model) {
    parts.push(`**Active model:** \`${observation.active_model}\``);
  }
  if (observation.reason) {
    parts.push(`**Reason:** ${observation.reason}`);
  }

  return parts.join("\n");
};

// Router-driven model switch (mirrors SwitchLLMObservation, but `model` is the
// activated profile name and `active_model` is the underlying model string).
const getClassifyAndSwitchLLMObservationContent = (
  event: ObservationEvent<ClassifyAndSwitchLLMObservation>,
): string => {
  const { observation } = event;

  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  if (observation.is_error) {
    return textContent
      ? `**Error:**\n${textContent}`
      : `**Error:**\nFailed to switch LLM profile.`;
  }

  const parts = [`**Profile:** \`${observation.model}\``];
  if (observation.active_model) {
    parts.push(`**Active model:** \`${observation.active_model}\``);
  }
  if (observation.chosen_class) {
    parts.push(`**Reason:** ${observation.chosen_class}`);
  }

  return parts.join("\n");
};

// Complex Observations
const getTaskTrackerObservationContent = (
  event: ObservationEvent<TaskTrackerObservation>,
): string => {
  const { observation } = event;

  const { command, task_list: taskList } = observation;
  let content = `**Command:** \`${command}\``;

  if (command === "plan" && taskList.length > 0) {
    content += `\n\n**Task List (${taskList.length} ${taskList.length === 1 ? "item" : "items"}):**\n`;

    taskList.forEach((task, index: number) => {
      const statusMap = {
        todo: "⏳",
        in_progress: "🔄",
        done: "✅",
      };
      const statusIcon =
        statusMap[task.status as keyof typeof statusMap] || "❓";

      content += `\n${index + 1}. ${statusIcon} **[${task.status.toUpperCase().replace("_", " ")}]** ${task.title}`;
      if (task.notes) {
        content += `\n   *Notes: ${task.notes}*`;
      }
    });
  } else if (command === "plan") {
    content += "\n\n**Task List:** Empty";
  }

  if (
    "content" in observation &&
    observation.content &&
    typeof observation.content === "string" &&
    observation.content.trim()
  ) {
    content += `\n\n**Result:** ${observation.content.trim()}`;
  }

  return content;
};

// Simple Observations
const getThinkObservationContent = (
  event: ObservationEvent<ThinkObservation>,
): string => {
  const { observation } = event;

  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  return textContent || "";
};

const getFinishObservationContent = (
  event: ObservationEvent<FinishObservation>,
): string => {
  const { observation } = event;

  // Extract text content from the observation
  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  let content = "";

  if (observation.is_error) {
    content += `**Error:**\n${textContent}`;
  } else {
    content += textContent;
  }

  return content;
};

// Glob Observations
const getGlobObservationContent = (
  event: ObservationEvent<GlobObservation>,
): string => {
  const { observation } = event;

  // Extract text content from the observation
  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  let content = `**Pattern:** \`${observation.pattern}\`\n`;
  content += `**Search Path:** \`${observation.search_path}\`\n\n`;

  if (observation.is_error) {
    content += `**Error:**\n${textContent}`;
  } else if (observation.files.length === 0) {
    content += "**Result:** No files found.";
  } else {
    content += `**Files Found (${observation.files.length}${observation.truncated ? "+, truncated" : ""}):**\n`;
    content += observation.files.map((f) => `- \`${f}\``).join("\n");
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    content = `${content.slice(0, MAX_CONTENT_LENGTH)}...(truncated)`;
  }

  return content;
};

// Grep Observations
const getGrepObservationContent = (
  event: ObservationEvent<GrepObservation>,
): string => {
  const { observation } = event;

  // Extract text content from the observation
  const textContent = observation.content
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("\n");

  let content = `**Pattern:** \`${observation.pattern}\`\n`;
  content += `**Search Path:** \`${observation.search_path}\`\n`;
  if (observation.include_pattern) {
    content += `**Include:** \`${observation.include_pattern}\`\n`;
  }
  content += "\n";

  if (observation.is_error) {
    content += `**Error:**\n${textContent}`;
  } else if (observation.matches.length === 0) {
    content += "**Result:** No matches found.";
  } else {
    content += `**Matches (${observation.matches.length}${observation.truncated ? "+, truncated" : ""}):**\n`;
    content += observation.matches.map((f) => `- \`${f}\``).join("\n");
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    content = `${content.slice(0, MAX_CONTENT_LENGTH)}...(truncated)`;
  }

  return content;
};

export const getObservationContent = (event: ObservationEvent): string => {
  const observationType = event.observation.kind;

  switch (observationType) {
    case "FileEditorObservation":
    case "StrReplaceEditorObservation":
      return getFileEditorObservationContent(
        event as ObservationEvent<
          FileEditorObservation | StrReplaceEditorObservation
        >,
      );

    case "ExecuteBashObservation":
    case "TerminalObservation":
      return getTerminalObservationContent(
        event as ObservationEvent<ExecuteBashObservation | TerminalObservation>,
      );

    case "BrowserObservation":
      return getBrowserObservationContent(
        event as ObservationEvent<BrowserObservation>,
      );

    case "MCPToolObservation":
      return getMCPToolObservationContent(
        event as ObservationEvent<MCPToolObservation>,
      );

    case "TaskTrackerObservation":
      return getTaskTrackerObservationContent(
        event as ObservationEvent<TaskTrackerObservation>,
      );

    case "ThinkObservation":
      return getThinkObservationContent(
        event as ObservationEvent<ThinkObservation>,
      );

    case "FinishObservation":
      return getFinishObservationContent(
        event as ObservationEvent<FinishObservation>,
      );

    case "GlobObservation":
      return getGlobObservationContent(
        event as ObservationEvent<GlobObservation>,
      );

    case "GrepObservation":
      return getGrepObservationContent(
        event as ObservationEvent<GrepObservation>,
      );

    case "InvokeTrackObservation":
      return getInvokeTrackObservationContent(
        event as ObservationEvent<InvokeTrackObservation>,
      );

    case "VinboxUIObservation":
      return getVinboxUIObservationContent(
        event as ObservationEvent<VinboxUIObservation>,
      );

    case "ClientToolObservation":
      return event.tool_name === VINBOX_UI_CLIENT_TOOL_NAME
        ? getVinboxUIObservationContent(
            event as ObservationEvent<VinboxUIObservation>,
          )
        : getDefaultEventContent(event);

    case "SwitchLLMObservation":
      return getSwitchLLMObservationContent(
        event as ObservationEvent<SwitchLLMObservation>,
      );
    case "ClassifyAndSwitchLLMObservation":
      return getClassifyAndSwitchLLMObservationContent(
        event as ObservationEvent<ClassifyAndSwitchLLMObservation>,
      );

    default:
      return getDefaultEventContent(event);
  }
};
