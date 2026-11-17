import { Settings } from "#/types/settings";
import { vinboxSettings } from "./vinbox-lane";

export const LATEST_SETTINGS_VERSION = 5;

// Vinbox owns the model lane. Every default below is resolved from the Vinbox
// lane resolver, so changing VINBOX_LLM_BASE_URL / VINBOX_HOME moves HandPrint
// with it and never leaves a stale hardcoded provider behind.
const VINBOX_LANE_DEFAULTS = vinboxSettings();

export const DEFAULT_SETTINGS: Settings = {
  // Vinbox owns the model lane. This points HandPrint at Vinbox's
  // OpenAI-compatible bridge (port 4097), which always answers with the model
  // selected in the Vinbox MODELS tab: free OpenCode models, local .gguf, or a
  // subscription provider the user enabled. HandPrint never invents a model.
  llm_model: VINBOX_LANE_DEFAULTS.llm_model,
  llm_base_url: VINBOX_LANE_DEFAULTS.llm_base_url,
  agent: "CodeActAgent",
  language: "en",
  llm_api_key: null,
  llm_api_key_set: false,
  search_api_key_set: false,
  confirmation_mode: false,
  security_analyzer: "llm",
  max_iterations: null,
  remote_runtime_resource_factor: 1,
  provider_tokens_set: {},
  enable_default_condenser: true,
  condenser_max_size: 240,
  enable_sound_notifications: false,
  user_consents_to_analytics: null,
  enable_proactive_conversation_starters: false,
  enable_solvability_analysis: false,
  run_router_at_conversation_start: false,
  search_api_key: "",
  is_new_user: true,
  disabled_tracks: [],
  mcp_config: {},
  max_budget_per_task: null,
  email: "",
  email_verified: true,
  git_user_name: "handprint",
  git_user_email: "handprint@juglow.my.id",
  title_llm_profile: null,
  agent_settings_schema: null,
  agent_settings: {
    schema_version: 8,
    agent_kind: "handprint",
    agent: "CodeActAgent",
    llm: {
      model: VINBOX_LANE_DEFAULTS.llm_model,
    },
    condenser: {
      enabled: true,
      max_size: 240,
    },
    verification: {
      critic_enabled: false,
      enable_iterative_refinement: false,
    },
    mcp_config: {},
  },
  conversation_settings_schema: null,
  conversation_settings: {
    schema_version: 1,
    confirmation_mode: false,
    security_analyzer: "llm",
  },
};

/**
 * Get the default settings
 */
export const getDefaultSettings = (): Settings => DEFAULT_SETTINGS;
