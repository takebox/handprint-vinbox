import { useCallback, useMemo } from "react";
import { useEventStore } from "#/stores/use-event-store";
import { useTrackInstallBannerStore } from "#/stores/track-install-banner-store";
import { detectTrackInstalls } from "#/utils/track-install-events";

/**
 * Track installs performed by the agent in this conversation (via the
 * bundled add-track flow), minus the ones the user dismissed. The event
 * store is global, so results are scoped to the conversation it currently
 * holds — a mismatched id (remount race) yields no installs.
 */
export const useTrackInstalls = (conversationId: string | null | undefined) => {
  const events = useEventStore((s) => s.events);
  const loadedConversationId = useEventStore((s) => s.loadedConversationId);
  const dismissedEventIds = useTrackInstallBannerStore(
    (s) => s.dismissedEventIds,
  );
  const dismiss = useTrackInstallBannerStore((s) => s.dismiss);

  const installs = useMemo(() => {
    if (!conversationId || conversationId !== loadedConversationId) return [];
    return detectTrackInstalls(events).filter(
      (install) => !dismissedEventIds[install.eventId],
    );
  }, [conversationId, loadedConversationId, events, dismissedEventIds]);

  const dismissAll = useCallback(
    () => dismiss(installs.map((install) => install.eventId)),
    [dismiss, installs],
  );

  return { installs, dismissAll };
};
