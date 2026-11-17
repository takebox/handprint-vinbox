import React from "react";
import { useTranslation } from "react-i18next";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import { ModalCloseButton } from "#/components/shared/modals/modal-close-button";
import { BrandButton } from "#/components/features/settings/brand-button";
import { SettingsSwitch } from "#/components/features/settings/settings-switch";
import { I18nKey } from "#/i18n/declaration";
import type { TrackInfo } from "#/types/settings";
import { cn } from "#/utils/utils";
import { modalTitleLgClassName } from "#/utils/modal-classes";
import CopyIcon from "#/icons/copy.svg?react";
import CheckmarkIcon from "#/icons/checkmark.svg?react";
import MessageSquareShareIcon from "#/icons/message-square-share.svg?react";
import { TrackIconBadge } from "./track-icon-badge";
import { getTrackCardDescription } from "./get-track-card-description";
import { buildTrackPills } from "./build-track-pills";
import { isCopyableTrackSource } from "./is-copyable-track-source";
import { TrackCardPillRow } from "./track-card-pill-row";
import { getTrackChatLaunchMessage } from "./get-track-chat-launch-message";
import { useLaunchTrackInChat } from "#/hooks/use-launch-track-in-chat";

interface TrackDetailModalProps {
  track: TrackInfo;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  onClose: () => void;
}

function ReadonlyTextArea({
  testId,
  label,
  value,
}: {
  testId: string;
  label: string;
  value: string;
}) {
  return (
    <label className="flex min-w-0 w-full flex-col gap-2.5">
      <span className="text-sm">{label}</span>
      <textarea
        data-testid={testId}
        readOnly
        value={value}
        rows={Math.min(12, Math.max(4, value.split("\n").length))}
        className={cn(
          "bg-surface-raised border border-border-subtle w-full min-w-0 rounded-sm p-2 text-sm",
          "cursor-not-allowed resize-none custom-scrollbar",
        )}
      />
    </label>
  );
}

export function TrackDetailModal({
  track,
  enabled,
  onToggle,
  onClose,
}: TrackDetailModalProps) {
  const { t } = useTranslation("handprint");
  const launchTrackInChat = useLaunchTrackInChat();
  const [sourceCopied, setSourceCopied] = React.useState(false);
  const chatLaunchMessage = React.useMemo(
    () => getTrackChatLaunchMessage(track),
    [track],
  );

  const description = getTrackCardDescription(track);
  const pills = React.useMemo(
    () =>
      buildTrackPills(track, t, {
        variant: "detail",
        testIdPrefix: "track-modal-pill",
      }),
    [track, t],
  );
  const showCopySource = isCopyableTrackSource(track.source);

  const handleCopySource = async () => {
    if (!track.source) {
      return;
    }

    await navigator.clipboard.writeText(track.source);
    setSourceCopied(true);
  };

  React.useEffect(() => {
    if (!sourceCopied) {
      return undefined;
    }

    const timeout = setTimeout(() => setSourceCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [sourceCopied]);

  return (
    <ModalBackdrop onClose={onClose} aria-label={track.name}>
      <div
        data-testid="track-detail-modal"
        data-track-name={track.name}
        className="relative flex w-130 max-w-[90vw] max-h-[85vh] flex-col overflow-hidden rounded-xl border border-border bg-base-secondary"
      >
        <ModalCloseButton onClose={onClose} testId="track-detail-modal-close" />
        <header className="flex flex-shrink-0 items-start gap-3 pb-4 pl-6 pr-12 pt-6">
          <TrackIconBadge trackName={track.name} />
          <div className="min-w-0 flex-1">
            <h2
              data-testid={`track-modal-name-${track.name}`}
              className={modalTitleLgClassName}
            >
              {track.name}
            </h2>
            {track.source ? (
              <div className="mt-0.5 flex min-w-0 items-center gap-1">
                <p
                  data-testid={`track-modal-source-${track.name}`}
                  className="min-w-0 flex-1 truncate text-xs text-tertiary-alt"
                  title={track.source}
                >
                  {track.source}
                </p>
                {showCopySource ? (
                  <button
                    type="button"
                    data-testid={`track-modal-copy-source-${track.name}`}
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
        </header>

        <div
          data-testid="track-detail-modal-content"
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-6 custom-scrollbar-always"
        >
          <div
            data-testid={`track-modal-enable-row-${track.name}`}
            className="flex w-full items-center rounded-lg border border-border bg-contrast/[0.04] px-3 py-2.5"
          >
            <SettingsSwitch
              testId={`track-modal-toggle-${track.name}`}
              isToggled={enabled}
              onToggle={onToggle}
              togglePosition="right"
            >
              {t(
                enabled
                  ? I18nKey.SETTINGS$TRACKS_ENABLED
                  : I18nKey.SETTINGS$TRACKS_DISABLED,
              )}
            </SettingsSwitch>
          </div>

          {description ? (
            <p
              data-testid={`track-modal-description-${track.name}`}
              className="break-words whitespace-pre-line text-xs text-tertiary-light"
            >
              {description}
            </p>
          ) : null}

          {pills.length > 0 ? (
            <TrackCardPillRow
              pills={pills}
              testId={`track-modal-pills-${track.name}`}
            />
          ) : null}

          {track.content ? (
            <ReadonlyTextArea
              testId={`track-modal-field-content-${track.name}`}
              label={t(I18nKey.SETTINGS$TRACKS_CONTENT)}
              value={track.content}
            />
          ) : null}
        </div>

        <footer
          data-testid="track-detail-modal-actions"
          className="flex flex-shrink-0 justify-end gap-2 px-6 pb-6 pt-4"
        >
          <BrandButton
            type="button"
            variant="secondary"
            onClick={onClose}
            testId="track-detail-close"
          >
            {t(I18nKey.BUTTON$CLOSE)}
          </BrandButton>
          <BrandButton
            type="button"
            variant="primary"
            isDisabled={!enabled}
            onClick={() => launchTrackInChat(chatLaunchMessage, onClose)}
            testId={`track-detail-use-track-${track.name}`}
            startContent={
              <MessageSquareShareIcon className="size-4" aria-hidden />
            }
          >
            {t(I18nKey.SETTINGS$TRACKS_USE_TRACK_BUTTON)}
          </BrandButton>
        </footer>
      </div>
    </ModalBackdrop>
  );
}
