import React from "react";
import { useTranslation } from "react-i18next";
import { useActiveBackend } from "#/contexts/active-backend-context";
import { useSaveSettings } from "#/hooks/mutation/use-save-settings";
import { useSettings } from "#/hooks/query/use-settings";
import { I18nKey } from "#/i18n/declaration";
import type { Settings, TrackInfo } from "#/types/settings";
import { displayErrorToast } from "#/utils/custom-toast-handlers";
import { retrieveAxiosErrorMessage } from "#/utils/retrieve-axios-error-message";
import {
  buildTrackEnablementFilter,
  CATALOG_TRACK_NAMES,
  isCatalogTrack,
  resolveEnabledCatalogTracks,
  type TrackEnablement,
} from "#/utils/track-enablement";

/**
 * Settings → the two lists. Cloud creates conversations from its own
 * server-side catalog and never reads `enabled_tracks`, so the catalog stays
 * deny-list governed there.
 */
function readTrackEnablement(
  settings: Settings | undefined,
  usesCatalogAllowList: boolean,
): TrackEnablement {
  return {
    enabledTracks: usesCatalogAllowList
      ? settings?.enabled_tracks
      : [...CATALOG_TRACK_NAMES],
    disabledTracks: settings?.disabled_tracks ?? [],
  };
}

/** Read-only view of the rule, for surfaces that list tracks without toggling. */
export function useTrackEnabledFilter(): (track: TrackInfo) => boolean {
  const { backend } = useActiveBackend();
  const { data: settings } = useSettings();
  const usesCatalogAllowList = backend.kind !== "cloud";

  return React.useMemo(() => {
    const isEnabled = buildTrackEnablementFilter(
      readTrackEnablement(settings, usesCatalogAllowList),
    );
    return (track: TrackInfo) => isEnabled(track.name);
  }, [
    settings?.enabled_tracks,
    settings?.disabled_tracks,
    usesCatalogAllowList,
  ]);
}

export interface TrackEnablementController {
  isEnabled: (track: TrackInfo) => boolean;
  setEnabled: (trackName: string, enabled: boolean) => void;
}

/** Stable form of both lists, so an unchanged set can skip the save. */
function snapshot(enablement: TrackEnablement): string {
  return JSON.stringify([
    [...resolveEnabledCatalogTracks(enablement)].sort(),
    [...(enablement.disabledTracks ?? [])].sort(),
  ]);
}

/** Same array reference when the membership already matches, to skip a save. */
function withMembership(
  list: string[],
  name: string,
  present: boolean,
): string[] {
  if (list.includes(name) === present) return list;
  return present ? [...list, name] : list.filter((entry) => entry !== name);
}

/**
 * Shared toggle state for every surface that switches tracks on and off.
 *
 * Which of the two lists a track belongs to is decided here alone, so one
 * surface cannot write a preference another cannot see.
 */
export function useTrackEnablement(): TrackEnablementController {
  const { t } = useTranslation("handprint");
  const { backend } = useActiveBackend();
  const usesCatalogAllowList = backend.kind !== "cloud";
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { mutate: saveSettings } = useSaveSettings();

  const [enablement, setEnablement] = React.useState<TrackEnablement>({});
  const savedRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (settingsLoading || !settings) return;
    const hydrated = readTrackEnablement(settings, usesCatalogAllowList);
    savedRef.current = snapshot(hydrated);
    setEnablement(hydrated);
  }, [
    settingsLoading,
    settings?.enabled_tracks,
    settings?.disabled_tracks,
    usesCatalogAllowList,
  ]);

  React.useEffect(() => {
    // Writing the hydrated value straight back would race the one-shot
    // migration and could narrow a workspace it had just preserved.
    const next = snapshot(enablement);
    if (savedRef.current === null || savedRef.current === next) return;
    savedRef.current = next;

    const disabledTracks = enablement.disabledTracks ?? [];
    saveSettings(
      usesCatalogAllowList
        ? {
            enabled_tracks: resolveEnabledCatalogTracks(enablement),
            disabled_tracks: disabledTracks,
          }
        : { disabled_tracks: disabledTracks },
      {
        onError: (error) => {
          displayErrorToast(
            retrieveAxiosErrorMessage(error) || t(I18nKey.ERROR$GENERIC),
          );
        },
      },
    );
  }, [enablement, usesCatalogAllowList, saveSettings, t]);

  const isEnabled = React.useMemo(() => {
    const enabled = buildTrackEnablementFilter(enablement);
    return (track: TrackInfo) => enabled(track.name);
  }, [enablement]);

  const setEnabled = React.useCallback(
    (trackName: string, enabled: boolean) => {
      setEnablement((previous) => {
        const allowListed = usesCatalogAllowList && isCatalogTrack(trackName);
        return {
          enabledTracks: allowListed
            ? withMembership(
                resolveEnabledCatalogTracks(previous),
                trackName,
                enabled,
              )
            : previous.enabledTracks,
          // A catalog track switched back on also leaves the deny-list, where
          // an unmigrated workspace may still hold it.
          disabledTracks: withMembership(
            previous.disabledTracks ?? [],
            trackName,
            !enabled && !allowListed,
          ),
        };
      });
    },
    [usesCatalogAllowList],
  );

  return { isEnabled, setEnabled };
}
