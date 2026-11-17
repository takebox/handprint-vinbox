import {
  Bot,
  GitPullRequest,
  Package,
  Palette,
  PenLine,
  Plug,
  ShieldCheck,
  Workflow,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  TRACK_CATEGORY_IDS,
  type TrackCategoryId,
} from "@handprint-ai/extensions/tracks";
import { I18nKey } from "#/i18n/declaration";
import type { TrackInfo } from "#/types/settings";

/** Display order in the facet rail. `other` last. */
export const TRACK_CATEGORY_ORDER: readonly TrackCategoryId[] = [
  "automations",
  "environment",
  "code-hosting",
  "agent-authoring",
  "code-quality",
  "integrations",
  "writing",
  "design",
  "other",
];

export const TRACK_CATEGORY_LABEL_KEYS: Record<TrackCategoryId, I18nKey> = {
  automations: I18nKey.SETTINGS$TRACKS_CATEGORY_AUTOMATIONS,
  environment: I18nKey.SETTINGS$TRACKS_CATEGORY_ENVIRONMENT,
  "code-hosting": I18nKey.SETTINGS$TRACKS_CATEGORY_CODE_HOSTING,
  "agent-authoring": I18nKey.SETTINGS$TRACKS_CATEGORY_AGENT_AUTHORING,
  "code-quality": I18nKey.SETTINGS$TRACKS_CATEGORY_CODE_QUALITY,
  integrations: I18nKey.SETTINGS$TRACKS_CATEGORY_INTEGRATIONS,
  writing: I18nKey.SETTINGS$TRACKS_CATEGORY_WRITING,
  design: I18nKey.SETTINGS$TRACKS_CATEGORY_DESIGN,
  other: I18nKey.SETTINGS$TRACKS_CATEGORY_OTHER,
};

export const TRACK_CATEGORY_ICONS: Record<TrackCategoryId, LucideIcon> = {
  automations: Workflow,
  environment: Wrench,
  "code-hosting": GitPullRequest,
  "agent-authoring": Bot,
  "code-quality": ShieldCheck,
  integrations: Plug,
  writing: PenLine,
  design: Palette,
  other: Package,
};

/** The catalog uses `other` for a track with no marketplace entry, so it means "uncategorized" there exactly as it does for a local track. */
export const UNCATEGORIZED_TRACK_CATEGORY: TrackCategoryId = "other";

const KNOWN_CATEGORIES = new Set<string>(TRACK_CATEGORY_IDS);

/** Local tracks carry no category and a stale bundled catalog could carry one this build does not know; both degrade to `other` rather than an unrenderable facet value. */
export function getTrackCategory(track: TrackInfo): TrackCategoryId {
  const raw = track.category;
  if (raw && KNOWN_CATEGORIES.has(raw)) {
    return raw;
  }
  return UNCATEGORIZED_TRACK_CATEGORY;
}
