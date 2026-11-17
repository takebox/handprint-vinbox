import { VINBOX_UI_CLIENT_ACTION_KIND } from "#/constants/vinbox-ui";
import { LAUNCH_CHILD_CONVERSATION_ACTION_KIND } from "#/constants/child-conversation";

type EventType =
  | "MCPTool"
  | "Finish"
  | "Think"
  | "ExecuteBash"
  | "Terminal"
  | "FileEditor"
  | "StrReplaceEditor"
  | "TaskTracker"
  | "PlanningFileEditor"
  | "InvokeTrack"
  | "SwitchLLM"
  | "ClassifyAndSwitchLLM";

type ActionOnlyType =
  | "BrowserNavigate"
  | "BrowserClick"
  | "BrowserType"
  | "BrowserGetState"
  | "BrowserGetContent"
  | "BrowserScroll"
  | "BrowserGoBack"
  | "BrowserListTabs"
  | "BrowserSwitchTab"
  | "BrowserCloseTab"
  // Legacy Python-defined Vinbox tool kind. The client-tool kind is added
  // separately below because the SDK generates its full discriminator.
  | "VinboxUI";

type ObservationOnlyType = "Browser";

type ActionEventType =
  | `${ActionOnlyType}Action`
  | `${EventType}Action`
  | "GlobAction"
  | "GrepAction"
  // The `task` tool delegating work to a spawned subagent.
  | "TaskAction"
  | typeof VINBOX_UI_CLIENT_ACTION_KIND
  | typeof LAUNCH_CHILD_CONVERSATION_ACTION_KIND;
type ObservationEventType =
  | `${ObservationOnlyType}Observation`
  | `${EventType}Observation`
  | "TerminalObservation"
  | "GlobObservation"
  | "GrepObservation"
  // Result of the `task` tool, which delegates work to a spawned subagent.
  | "TaskObservation"
  // Legacy and client-defined acknowledgements for Vinbox UI dispatches.
  | "VinboxUIObservation"
  | "ClientToolObservation";

export interface ActionBase<T extends ActionEventType = ActionEventType> {
  kind: T;
}

export interface ObservationBase<
  T extends ObservationEventType = ObservationEventType,
> {
  kind: T;
}
