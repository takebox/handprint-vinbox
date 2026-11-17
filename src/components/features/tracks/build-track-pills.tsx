import React from "react";
import type { TFunction } from "i18next";
import { I18nKey } from "#/i18n/declaration";
import type { TrackInfo } from "#/types/settings";
import { cn } from "#/utils/utils";
import { TrackTypeBadge } from "./track-type-badge";
import {
  TRACK_CARD_PILL_CLASS,
  type TrackCardPill,
} from "./track-card-pill-row";
import {
  getTrackCategory,
  TRACK_CATEGORY_LABEL_KEYS,
  UNCATEGORIZED_TRACK_CATEGORY,
} from "#/utils/track-category";
import { isRecommendedTrack } from "#/utils/track-enablement";

type TrackPillVariant = "card" | "detail";

interface BuildTrackPillsOptions {
  variant?: TrackPillVariant;
  testIdPrefix?: string;
}

function pillTestId(
  prefix: string | undefined,
  trackName: string,
  suffix: string,
) {
  if (prefix) {
    return `${prefix}-${trackName}-${suffix}`;
  }
  return undefined;
}

export function buildTrackPills(
  track: TrackInfo,
  translate: TFunction,
  options: BuildTrackPillsOptions = {},
): TrackCardPill[] {
  const { variant = "card", testIdPrefix } = options;
  const category = getTrackCategory(track);
  const pills: TrackCardPill[] = [
    {
      id: `type-${track.type}`,
      node: <TrackTypeBadge type={track.type} />,
    },
  ];

  if (isRecommendedTrack(track.name)) {
    pills.push({
      id: "recommended",
      node: (
        <span
          data-testid={
            pillTestId(testIdPrefix, track.name, "recommended") ??
            `track-recommended-${track.name}`
          }
          className={TRACK_CARD_PILL_CLASS}
        >
          {translate(I18nKey.SETTINGS$TRACKS_RECOMMENDED)}
        </span>
      ),
    });
  }

  // An "Other" pill says nothing, and every local track would carry one:
  // only the catalog assigns categories.
  if (category !== UNCATEGORIZED_TRACK_CATEGORY) {
    pills.push({
      id: `category-${category}`,
      node: (
        <span
          data-testid={
            pillTestId(testIdPrefix, track.name, "category") ??
            `track-category-${track.name}`
          }
          className={TRACK_CARD_PILL_CLASS}
        >
          {translate(TRACK_CATEGORY_LABEL_KEYS[category])}
        </span>
      ),
    });
  }

  if (track.version) {
    pills.push({
      id: `version-${track.version}`,
      node: (
        <span
          data-testid={
            pillTestId(testIdPrefix, track.name, "version") ??
            `track-version-${track.name}`
          }
          className={TRACK_CARD_PILL_CLASS}
        >
          {translate(I18nKey.SETTINGS$TRACKS_VERSION, {
            version: track.version,
          })}
        </span>
      ),
    });
  }

  if (variant === "detail" && track.license) {
    pills.push({
      id: `license-${track.license}`,
      node: (
        <span
          data-testid={pillTestId(testIdPrefix, track.name, "license")}
          className={TRACK_CARD_PILL_CLASS}
        >
          {track.license}
        </span>
      ),
    });
  }

  if (variant === "detail" && track.compatibility) {
    pills.push({
      id: `compatibility-${track.compatibility}`,
      node: (
        <span
          data-testid={pillTestId(testIdPrefix, track.name, "compatibility")}
          className={TRACK_CARD_PILL_CLASS}
        >
          {track.compatibility}
        </span>
      ),
    });
  }

  if (track.disable_model_invocation) {
    pills.push({
      id: "disable-model-invocation",
      node: (
        <span
          data-testid={
            pillTestId(testIdPrefix, track.name, "disable-model-invocation") ??
            `track-disable-model-invocation-${track.name}`
          }
          className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap rounded-full border border-[rgba(248,113,113,0.35)] bg-[rgba(248,113,113,0.12)] px-2 py-0.5 text-[11px] font-medium leading-4 text-[#fca5a5]"
        >
          <span className="size-1.5 rounded-full bg-[#fca5a5]" />
          {translate(I18nKey.SETTINGS$TRACKS_DISABLE_MODEL_INVOCATION)}
        </span>
      ),
    });
  }

  if (variant === "detail" && track.allowed_tools) {
    for (const tool of track.allowed_tools) {
      pills.push({
        id: `allowed-tool-${tool}`,
        node: (
          <span
            data-testid={pillTestId(testIdPrefix, track.name, `tool-${tool}`)}
            className={cn(TRACK_CARD_PILL_CLASS, "font-mono")}
          >
            {tool}
          </span>
        ),
      });
    }
  }

  if (variant === "detail" && track.metadata) {
    for (const [key, value] of Object.entries(track.metadata)) {
      pills.push({
        id: `metadata-${key}`,
        node: (
          <span
            data-testid={pillTestId(
              testIdPrefix,
              track.name,
              `metadata-${key}`,
            )}
            className={TRACK_CARD_PILL_CLASS}
          >
            <span className="font-mono text-[10px] text-tertiary-light">
              {key}:
            </span>{" "}
            {value}
          </span>
        ),
      });
    }
  }

  for (const trigger of track.triggers ?? []) {
    pills.push({
      id: `trigger-${trigger}`,
      node: (
        <span
          data-testid={pillTestId(
            testIdPrefix,
            track.name,
            `trigger-${trigger}`,
          )}
          className={TRACK_CARD_PILL_CLASS}
        >
          {trigger}
        </span>
      ),
    });
  }

  return pills;
}
