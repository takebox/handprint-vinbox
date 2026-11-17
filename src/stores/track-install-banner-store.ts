import { create } from "zustand";
import { devtools } from "zustand/middleware";

interface TrackInstallBannerState {
  /**
   * Install observation event ids the user dismissed. Session-only by
   * design: the "track not active in this conversation" condition persists
   * across reloads, so the banner truthfully reappearing then is fine. A
   * new install (new event id) resurfaces the banner after a dismissal;
   * replays of the same event stay dismissed.
   */
  dismissedEventIds: Record<string, true>;
}

interface TrackInstallBannerActions {
  dismiss: (eventIds: string[]) => void;
}

type TrackInstallBannerStore = TrackInstallBannerState &
  TrackInstallBannerActions;

const initialState: TrackInstallBannerState = { dismissedEventIds: {} };

export const useTrackInstallBannerStore = create<TrackInstallBannerStore>()(
  devtools(
    (set) => ({
      ...initialState,
      dismiss: (eventIds) =>
        set((s) => ({
          dismissedEventIds: {
            ...s.dismissedEventIds,
            ...Object.fromEntries(eventIds.map((id) => [id, true as const])),
          },
        })),
    }),
    { name: "TrackInstallBannerStore" },
  ),
);
