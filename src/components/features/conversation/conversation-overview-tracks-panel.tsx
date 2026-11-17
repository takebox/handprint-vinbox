import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { I18nKey } from "#/i18n/declaration";
import { useSettings } from "#/hooks/query/use-settings";
import { useActiveConversation } from "#/hooks/query/use-active-conversation";
import { useConversationTracks } from "#/hooks/query/use-conversation-tracks";
import { useTrackEnablement } from "#/hooks/use-track-enablement";
import { TrackCard } from "#/components/features/tracks/track-card";
import { TrackDetailModal } from "#/components/features/tracks/track-detail-modal";
import { AddTrackModal } from "#/components/features/tracks/add-track-modal";
import { TracksToolbar } from "#/components/features/tracks/tracks-toolbar";
import { TrackFiltersModal } from "#/components/features/tracks/track-filters-modal";
import {
  applyTrackFilters,
  buildTrackFacetGroups,
  clearTrackFilterFacets,
  countActiveFilters,
  toggleTrackFilterValue,
  EMPTY_TRACK_FILTER_STATE,
  type TrackFilterState,
} from "#/components/features/tracks/track-filter";
import {
  extensionModuleCardGridClassName,
  extensionModuleCardGridContainerClassName,
  extensionModuleEmptyStateClassName,
} from "#/utils/extension-module-card-classes";
import type { TrackInfo } from "#/types/settings";
import { cn } from "#/utils/utils";
import {
  CONVERSATION_OVERVIEW_PROJECT_SCOPE,
  filterTracksByProjectScope,
  sortTracksByProjectRelevance,
  type ConversationOverviewProjectScope,
} from "#/utils/conversation-overview-project-scope";
import { useConversationOverviewDrawerOptional } from "./conversation-overview-drawer-context";
import { ConversationOverviewProjectScopeToggle } from "./conversation-overview-project-scope-toggle";

interface ConversationOverviewTracksPanelProps {
  openAdd: boolean;
}

export function ConversationOverviewTracksPanel({
  openAdd,
}: ConversationOverviewTracksPanelProps) {
  const { t } = useTranslation("handprint");
  const { isLoading: settingsLoading } = useSettings();
  const { data: conversation } = useActiveConversation();
  const { data: tracks, isLoading: tracksLoading } = useConversationTracks();
  const { isEnabled, setEnabled } = useTrackEnablement();
  const addRequestKey =
    useConversationOverviewDrawerOptional()?.addRequestKey ?? 0;
  const projectDir = conversation?.selected_workspace ?? null;

  const [projectScope, setProjectScope] =
    useState<ConversationOverviewProjectScope>(
      CONVERSATION_OVERVIEW_PROJECT_SCOPE.project,
    );
  const [filter, setFilter] = useState<TrackFilterState>(
    EMPTY_TRACK_FILTER_STATE,
  );
  const [isFiltersModalOpen, setIsFiltersModalOpen] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState<TrackInfo | null>(null);
  const [showAddTrackModal, setShowAddTrackModal] = useState(false);

  useEffect(() => {
    if (!openAdd) {
      return;
    }
    setShowAddTrackModal(true);
  }, [openAdd]);

  useEffect(() => {
    if (addRequestKey === 0) {
      return;
    }
    setShowAddTrackModal(true);
  }, [addRequestKey]);

  const scopedTracks = useMemo(() => {
    if (!tracks) {
      return [];
    }
    const filtered = filterTracksByProjectScope(
      tracks,
      projectScope,
      projectDir,
    );
    return projectScope === CONVERSATION_OVERVIEW_PROJECT_SCOPE.all
      ? sortTracksByProjectRelevance(filtered, projectDir)
      : filtered;
  }, [tracks, projectScope, projectDir]);

  const filteredTracks = useMemo(
    () => applyTrackFilters(scopedTracks, isEnabled, filter),
    [scopedTracks, isEnabled, filter],
  );

  if (tracksLoading || settingsLoading) {
    return (
      <div
        data-testid="conversation-overview-tracks-panel"
        className="text-sm text-muted"
      >
        …
      </div>
    );
  }

  if (!tracks || tracks.length === 0) {
    return (
      <div
        data-testid="conversation-overview-tracks-panel"
        className="flex flex-col gap-4"
      >
        <div
          data-testid="conversation-overview-tracks-empty"
          className={extensionModuleEmptyStateClassName}
        >
          <p className="text-sm text-tertiary-light">
            {t(I18nKey.SETTINGS$TRACKS_NO_TRACKS)}
          </p>
        </div>
        {showAddTrackModal ? (
          <AddTrackModal onClose={() => setShowAddTrackModal(false)} />
        ) : null}
      </div>
    );
  }

  return (
    <div
      data-testid="conversation-overview-tracks-panel"
      className="flex flex-col gap-4"
    >
      <ConversationOverviewProjectScopeToggle
        value={projectScope}
        onChange={setProjectScope}
        testId="conversation-overview-tracks-scope"
      />
      <TracksToolbar
        search={filter.query}
        onSearchChange={(query) =>
          setFilter((previous) => ({ ...previous, query }))
        }
        activeFilterCount={countActiveFilters(filter)}
        onOpenFilters={() => setIsFiltersModalOpen(true)}
      />

      {scopedTracks.length === 0 ? (
        <div
          data-testid="conversation-overview-tracks-project-empty"
          className={extensionModuleEmptyStateClassName}
        >
          <p className="text-sm text-tertiary-light">
            {t(I18nKey.CONVERSATION$OVERVIEW_SCOPE_PROJECT_EMPTY_TRACKS)}
          </p>
        </div>
      ) : filteredTracks.length === 0 ? (
        <div
          data-testid="conversation-overview-tracks-no-match"
          className={extensionModuleEmptyStateClassName}
        >
          <p className="text-sm text-tertiary-light">
            {t(I18nKey.SETTINGS$TRACKS_NO_MATCH)}
          </p>
        </div>
      ) : (
        <section
          className={cn(
            "flex min-w-0 flex-col gap-3",
            extensionModuleCardGridContainerClassName,
          )}
        >
          <div className={cn(extensionModuleCardGridClassName, "grid-cols-1")}>
            {filteredTracks.map((track) => (
              <TrackCard
                key={track.name}
                track={track}
                enabled={isEnabled(track)}
                onOpen={() => setSelectedTrack(track)}
                onToggle={(enabled) => setEnabled(track.name, enabled)}
              />
            ))}
          </div>
        </section>
      )}

      {selectedTrack ? (
        <TrackDetailModal
          track={selectedTrack}
          enabled={isEnabled(selectedTrack)}
          onToggle={(enabled) => setEnabled(selectedTrack.name, enabled)}
          onClose={() => setSelectedTrack(null)}
        />
      ) : null}

      {showAddTrackModal ? (
        <AddTrackModal onClose={() => setShowAddTrackModal(false)} />
      ) : null}

      {isFiltersModalOpen ? (
        <TrackFiltersModal
          groups={buildTrackFacetGroups(scopedTracks, isEnabled, filter)}
          activeCount={countActiveFilters(filter)}
          onToggle={(groupId, value) =>
            setFilter((previous) =>
              toggleTrackFilterValue(previous, groupId, value),
            )
          }
          onClearAll={() =>
            setFilter((previous) => clearTrackFilterFacets(previous))
          }
          onClose={() => setIsFiltersModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
