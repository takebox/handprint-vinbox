import packageJson from "../../package.json";

export const AGENT_VINBOX_CLIENT_SOURCE = "agent_vinbox";
export const AGENT_VINBOX_CLIENT_VERSION = packageJson.version;

/**
 * Coarse, non-user-identifying request metadata for Cloud observability.
 *
 * Cloud ingress can retain these headers as facets without logging request
 * bodies, API keys, device codes, or conversation content.
 */
export const HANDPRINT_CLIENT_HEADER = "X-Handprint-Client";
export const HANDPRINT_CLIENT_VERSION_HEADER = "X-Handprint-Client-Version";
export const HANDPRINT_TELEMETRY_DISTINCT_ID_HEADER =
  "X-Handprint-Telemetry-Distinct-Id";

export const AGENT_VINBOX_CLIENT_HEADERS: Readonly<Record<string, string>> = {
  [HANDPRINT_CLIENT_HEADER]: AGENT_VINBOX_CLIENT_SOURCE,
  [HANDPRINT_CLIENT_VERSION_HEADER]: AGENT_VINBOX_CLIENT_VERSION,
};
