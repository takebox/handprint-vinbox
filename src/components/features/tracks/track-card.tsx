import React from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import type { TrackInfo } from "#/types/settings";
import { cn } from "#/utils/utils";
import CopyIcon from "#/icons/copy.svg?react";
import CheckmarkIcon from "#/icons/checkmark.svg?react";
import { CirclePlusCheckToggle } from "#/components/shared/buttons/circle-plus-check-toggle";
import { TrackIconBadge } from "./track-icon-badge";
import { TrackCardPillRow } from "./track-card-pill-row";
import { getTrackCardDescription } from "./get-track-card-description";
import { buildTrackPills } from "./build-track-pills";
import { isCopyableTrackSource } from "./is-copyable-track-source";
import {
  extensionModuleCardInteractiveClassName,
  extensionModuleCardSurfaceClassName,
} from "#/utils/extension-module-card-classes";

interface TrackCardProps {
  track: TrackInfo;
  enabled: boolean;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
}

export function TrackCard({
  track,
  enabled,
  onOpen,
  onToggle,
}: TrackCardProps) {
  const { t } = useTranslation("handprint");
  const [sourceCopied, setSourceCopied] = React.useState(false);

  const description = getTrackCardDescription(track);
  const pills = React.useMemo(() => buildTrackPills(track, t), [track, t]);
  const showCopySource = isCopyableTrackSource(track.source);

  const handleCopySource = async (event: React.MouseEvent) => {
    event.stopPropagation();
    if (!track.source) {
      return;
    }

    await navigator.clipboard.writeText(track.source);
    setSourceCopied(true);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  };

  React.useEffect(() => {
    if (!sourceCopied) {
      return undefined;
    }

    const timeout = setTimeout(() => setSourceCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [sourceCopied]);

  return (
    <div
      data-testid={`track-card-${track.name}`}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
      className={cn(
        "flex min-w-0 flex-col gap-3 overflow-hidden p-4",
        extensionModuleCardSurfaceClassName,
        extensionModuleCardInteractiveClassName,
      )}
    >
      <div className="flex items-start gap-3">
        <TrackIconBadge trackName={track.name} />
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <header className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <h3
                data-testid={`track-name-${track.name}`}
                className="truncate text-sm font-semibold text-contrast"
              >
                {track.name}
              </h3>
              {track.source ? (
                <div className="mt-0.5 flex min-w-0 items-center gap-1">
                  <p
                    data-testid={`track-source-${track.name}`}
                    className="min-w-0 flex-1 truncate text-xs text-tertiary-alt"
                    title={track.source}
                  >
                    {track.source}
                  </p>
                  {showCopySource ? (
                    <button
                      type="button"
                      data-testid={`track-copy-source-${track.name}`}
                      aria-label={t(
                        sourceCopied
                          ? I18nKey.BUTTON$COPIED
                          : I18nKey.SETTINGS$TRACKS_COPY_PATH,
                      )}
                      disabled={sourceCopied}
                      onClick={handleCopySource}
                      className="shrink-0 cursor-pointer border-0 bg-transparent p-0.5 text-tertiary-alt hover:text-contrast disabled:cursor-default [&_path]:fill-current"
                    >
                      {sourceCopied ? (
                        <CheckmarkIcon width={12} height={12} />
                      ) : (
                        <CopyIcon width={12} height={12} />
                      )}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <CirclePlusCheckToggle
              testId={`track-toggle-${track.name}`}
              isSelected={enabled}
              onToggle={onToggle}
              disableTooltipKey={I18nKey.COMMON$DISABLE}
            />
          </header>

          {description ? (
            <div
              data-testid={`track-description-${track.name}`}
              className="min-w-0"
            >
              <p className="line-clamp-2 break-words text-xs leading-relaxed text-tertiary-light">
                {description}
              </p>
            </div>
          ) : null}

          {pills.length > 0 ? (
            <TrackCardPillRow
              pills={pills}
              testId={`track-triggers-${track.name}`}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
