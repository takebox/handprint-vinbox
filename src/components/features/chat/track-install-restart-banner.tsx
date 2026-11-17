import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { useTrackInstalls } from "#/hooks/use-track-installs";
import { useCreateConversation } from "#/hooks/mutation/use-create-conversation";
import { useIsCreatingConversation } from "#/hooks/use-is-creating-conversation";
import { useNavigation } from "#/context/navigation-context";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { displayErrorToast } from "#/utils/custom-toast-handlers";

export interface TrackInstallRestartBannerProps {
  conversationId: string | null | undefined;
}

/**
 * Pinned notice shown after the agent installs a track via the bundled
 * add-track flow. The SDK loads tracks once at conversation start, so a
 * chat-installed track can't activate in the running conversation — this
 * banner says so and offers one action: start a new conversation in the
 * directory the track was installed to.
 */
export function TrackInstallRestartBanner({
  conversationId,
}: TrackInstallRestartBannerProps) {
  const { t } = useTranslation("handprint");
  const { installs, dismissAll } = useTrackInstalls(conversationId);
  const { backend } = useActiveBackend();
  const { mutate: createConversation, isPending } = useCreateConversation();
  const isCreatingElsewhere = useIsCreatingConversation();
  const { navigate } = useNavigation();
  const { data: conversation } = useActiveConversation();

  // Local-only: the cloud create path ignores workingDir entirely.
  if (backend.kind !== "local" || installs.length === 0) return null;

  const latest = installs[installs.length - 1];
  const trackNames = installs
    .filter((install) => install.workspacePath === latest.workspacePath)
    .map((install) => install.trackName);

  const handleRestart = () => {
    if (isPending || isCreatingElsewhere) return;
    createConversation(
      {
        // The agent's real install root, parsed from the fetch_track.py
        // success line — correct even for worktree conversations where
        // selected_workspace would point elsewhere.
        workingDir: latest.workspacePath,
        // new_worktree would start from a fresh worktree without the
        // freshly installed .agents/tracks/ directory.
        workspaceMode: "local_repo",
        repository:
          conversation?.selected_repository && conversation?.git_provider
            ? {
                name: conversation.selected_repository,
                gitProvider: conversation.git_provider,
                branch: conversation.selected_branch ?? undefined,
              }
            : undefined,
        entryPoint: "track_install_restart_banner",
      },
      {
        onSuccess: (data) => navigate(`/conversations/${data.conversation_id}`),
        onError: (error) => displayErrorToast(error.message),
      },
    );
  };

  return (
    <div
      className="flex w-full items-start gap-2 rounded-lg border border-border bg-surface-raised p-2 text-foreground"
      data-testid="track-install-restart-banner"
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm text-foreground">
          {t(I18nKey.TRACKS$INSTALL_BANNER_MESSAGE, {
            tracks: trackNames.join(", "),
          })}
        </p>
        <button
          type="button"
          onClick={handleRestart}
          disabled={isPending || isCreatingElsewhere}
          className="mt-2 cursor-pointer rounded-md border border-border px-2 py-1 text-xs font-normal text-foreground hover:bg-interactive-hover disabled:cursor-not-allowed disabled:opacity-50"
          data-testid="track-install-restart-action"
        >
          {t(I18nKey.TRACKS$INSTALL_BANNER_ACTION)}
        </button>
      </div>
      <button
        type="button"
        onClick={dismissAll}
        className="shrink-0 cursor-pointer rounded-md p-1 text-muted hover:bg-interactive-hover hover:text-foreground"
        aria-label={t(I18nKey.BUTTON$CLOSE)}
        data-testid="track-install-restart-dismiss"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
