import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import type { TrackType } from "#/types/settings";

interface TrackTypeBadgeProps {
  type: TrackType;
}

/** Theme-aware pill chrome for track type badges only (not shared metadata pills). */
const TRACK_TYPE_BADGE_CLASS_NAME =
  "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-text-secondary/35 bg-text-secondary/12 px-2 py-0.5 text-[11px] font-medium leading-4 text-tertiary-light";

const TYPE_CONFIG: Record<TrackType, { labelKey: I18nKey }> = {
  agenttracks: {
    labelKey: I18nKey.SETTINGS$TRACKS_TYPE_AGENTTRACKS,
  },
  knowledge: {
    labelKey: I18nKey.SETTINGS$TRACKS_TYPE_KNOWLEDGE,
  },
  repo: {
    labelKey: I18nKey.SETTINGS$TRACKS_TYPE_REPO,
  },
};

export function getTrackTypeLabelKey(type: TrackType): I18nKey {
  return TYPE_CONFIG[type].labelKey;
}

export function TrackTypeBadge({ type }: TrackTypeBadgeProps) {
  const { t } = useTranslation("handprint");
  const config = TYPE_CONFIG[type];
  return (
    <span
      data-testid={`track-type-badge-${type}`}
      className={TRACK_TYPE_BADGE_CLASS_NAME}
    >
      {t(config.labelKey)}
    </span>
  );
}
