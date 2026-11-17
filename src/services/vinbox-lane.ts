/**
 * Vinbox lane for HandPrint.
 *
 * HandPrint runs INSIDE the Vinbox machine, so it does not own a model stack, a
 * browser or a terminal. Everything comes from Vinbox:
 *
 *  - LLM      : Vinbox's OpenAI-compatible bridge (port 4097), which always
 *               answers with the model selected in the Vinbox MODELS tab.
 *               That tab covers the free OpenCode models, the local llama.cpp
 *               `.gguf` files in `vinbox/models/`, and the subscription
 *               providers the user enabled. No second provider stack.
 *  - Browser  : the single Chromium Vinbox keeps open on CDP 9222.
 *  - Terminal : Vinbox's pwsh, working inside `app/program-file`.
 *  - State    : `vinbox/data/` (bind-mounted, survives a rebuild).
 *
 * Every value can be overridden by the matching environment variable, so the
 * same build also runs standalone during development.
 */

export const VINBOX_LLM_PORT = 4097;
export const VINBOX_OPENCODE_PORT = 4096;
export const VINBOX_CDP_PORT = 9222;

export const VINBOX_DEFAULTS = {
  /** OpenAI-compatible bridge that fronts Vinbox's model lane. */
  llmBaseUrl: `http://127.0.0.1:${VINBOX_LLM_PORT}/v1`,
  /** The bridge ignores this id and uses the Vinbox MODELS tab selection. */
  llmModel: "vinbox-auto",
  /** Vinbox's single Chromium; agents attach here instead of launching one. */
  cdpUrl: `http://127.0.0.1:${VINBOX_CDP_PORT}`,
  /** Vinbox terminal shell and the File Manager it works in. */
  shell: "pwsh",
  workingDir: "/app/vinbox/app/program-file",
  /** Vinbox's persisted model + provider settings. */
  modelsJson: "/app/vinbox/data/models.json",
  /** Vinbox's settings API (MODELS tab lives here). */
  settingsApi: "http://127.0.0.1:7331",
} as const;

interface VinboxProcessShape {
  env?: Record<string, string | undefined>;
}

/**
 * Read an env var without depending on @types/node.
 *
 * HandPrint is bundled for the browser as well as Electron, so `process` is
 * not guaranteed to be typed. Reading it through globalThis keeps this module
 * compilable in both targets.
 */
function env(name: string): string | undefined {
  const scope = globalThis as { process?: VinboxProcessShape };
  const value = scope.process?.env?.[name];
  return value && value.trim() ? value.trim() : undefined;
}

export interface VinboxLane {
  llmBaseUrl: string;
  llmModel: string;
  cdpUrl: string;
  shell: string;
  workingDir: string;
  modelsJson: string;
  settingsApi: string;
  /** True when the process is clearly running inside a Vinbox tree. */
  insideVinbox: boolean;
}

/**
 * Resolve the Vinbox lane.
 *
 * Inside Vinbox, `VINBOX_HOME` is set by the container entrypoint. When it is
 * absent the defaults above still point at the container's own loopback ports,
 * so HandPrint keeps working with the same lane either way.
 */
export function resolveVinboxLane(): VinboxLane {
  const home = env("VINBOX_HOME");
  const workingDir =
    env("VINBOX_PROGRAM_FILE") ??
    (home ? `${home}/app/program-file` : VINBOX_DEFAULTS.workingDir);

  return {
    llmBaseUrl: env("VINBOX_LLM_BASE_URL") ?? VINBOX_DEFAULTS.llmBaseUrl,
    llmModel: env("VINBOX_LLM_MODEL") ?? VINBOX_DEFAULTS.llmModel,
    cdpUrl: env("BROWSER_CDP_URL") ?? env("VINBOX_CDP_URL") ?? VINBOX_DEFAULTS.cdpUrl,
    shell: env("VINBOX_SHELL") ?? VINBOX_DEFAULTS.shell,
    workingDir,
    modelsJson: home
      ? `${home}/data/models.json`
      : VINBOX_DEFAULTS.modelsJson,
    settingsApi: env("VINBOX_API") ?? VINBOX_DEFAULTS.settingsApi,
    insideVinbox: Boolean(home),
  };
}

/** Settings HandPrint must carry so the agent uses the Vinbox lane. */
export function vinboxSettings(): { llm_model: string; llm_base_url: string } {
  const lane = resolveVinboxLane();
  return { llm_model: lane.llmModel, llm_base_url: lane.llmBaseUrl };
}
