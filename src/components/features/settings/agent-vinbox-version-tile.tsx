import React from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpCircle, CheckCircle2 } from "lucide-react";
import { compareAgentServerVersions } from "#/api/agent-server-compatibility";
import { getLockedCloudHost } from "#/api/agent-server-config";
import { AGENT_VINBOX_CLIENT_VERSION } from "#/api/client-source";
import { useLatestAgentVinboxVersion } from "#/hooks/query/use-latest-agent-vinbox-version";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";
import { AgentVinboxVersionModal } from "./agent-vinbox-version-modal";

interface AgentVinboxVersionTileProps {
  className?: string;
  /** When true, the tile is omitted unless an update is available. */
  hideWhenUpToDate?: boolean;
}

/**
 * Main-sidebar tile that opens the update-specific version modal.
 * Hidden when the install is already up to date; settings uses
 * AgentVinboxUpdateCard instead.
 */
export function AgentVinboxVersionTile({
  className,
  hideWhenUpToDate = false,
}: AgentVinboxVersionTileProps) {
  const { t } = useTranslation("handprint");
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const isLockedToCloud = getLockedCloudHost() !== null;
  const latestVersionQuery = useLatestAgentVinboxVersion({
    enabled: !isLockedToCloud,
  });

  if (isLockedToCloud) return null;

  const installedVersion = AGENT_VINBOX_CLIENT_VERSION;
  const latestVersion = latestVersionQuery.data ?? null;
  const comparison =
    latestVersion !== null
      ? compareAgentServerVersions(latestVersion, installedVersion)
      : null;
  const updateAvailable = comparison === 1;

  if (hideWhenUpToDate && !updateAvailable) return null;

  return (
    <>
      <button
        type="button"
        data-testid="agent-vinbox-version-tile"
        onClick={() => setIsModalOpen(true)}
        aria-label={t(I18nKey.SETTINGS$VERSION_TILE_ARIA_LABEL)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md border border-border bg-base-secondary px-3 py-2 text-left hover:bg-surface-raised",
          className,
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-5 text-contrast">
            {updateAvailable
              ? t(I18nKey.SETTINGS$VERSION_TILE_NEW_VERSION)
              : t(I18nKey.SETTINGS$VERSION_PRODUCT_NAME)}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 truncate text-xs leading-5">
            <span className="text-muted">
              {t(I18nKey.SETTINGS$APP_UPDATE_VERSION_LABEL)}
            </span>
            <span className="truncate text-contrast">
              {updateAvailable && latestVersion
                ? latestVersion
                : installedVersion}
            </span>
          </span>
        </span>
        {updateAvailable ? (
          <ArrowUpCircle
            className="size-5 shrink-0 text-[#3B82F6]"
            aria-hidden
          />
        ) : (
          <CheckCircle2
            className="size-5 shrink-0 text-status-success"
            aria-hidden
          />
        )}
      </button>

      {isModalOpen ? (
        <AgentVinboxVersionModal
          installedVersion={installedVersion}
          latestVersion={latestVersion}
          updateAvailable={updateAvailable}
          isChecking={latestVersionQuery.isFetching}
          onCheckForUpdates={() => {
            void latestVersionQuery.refetch();
          }}
          onClose={() => setIsModalOpen(false)}
        />
      ) : null}
    </>
  );
}
