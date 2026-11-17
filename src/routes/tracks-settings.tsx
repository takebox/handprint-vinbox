import React from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router";
import { BrandButton } from "#/components/features/settings/brand-button";
import { ExtensionsNavigation } from "#/components/features/tracks/extensions-navigation";
import { AddTrackModal } from "#/components/features/tracks/add-track-modal";
import { TrackCard } from "#/components/features/tracks/track-card";
import { TrackDetailModal } from "#/components/features/tracks/track-detail-modal";
import { TrackFacetRail } from "#/components/features/tracks/track-facet-rail";
import { TrackFiltersModal } from "#/components/features/tracks/track-filters-modal";
import {
  applyTrackFilters,
  buildTrackFacetGroups,
  clearTrackFilterFacets,
  countActiveFilters,
  parseTrackFilterState,
  TRACK_FILTER_QUERY_PARAM,
  toggleTrackFilterValue,
  toTrackFilterSearchParams,
  type TrackFacetGroupId,
  type TrackFilterState,
} from "#/components/features/tracks/track-filter";
import { TracksToolbar } from "#/components/features/tracks/tracks-toolbar";
import { useSettings } from "#/hooks/query/use-settings";
import { useTracks } from "#/hooks/query/use-tracks";
import { useTrackEnablement } from "#/hooks/use-track-enablement";
import { I18nKey } from "#/i18n/declaration";
import type { TrackInfo } from "#/types/settings";
import {
  extensionModuleCardGridClassName,
  extensionModuleCardGridContainerClassName,
  extensionModuleEmptyStateClassName,
} from "#/utils/extension-module-card-classes";
import { settingsLikeMainScrollClassName } from "#/utils/settings-like-page-layout-classes";
import { cn } from "#/utils/utils";

const SEARCH_URL_SYNC_DELAY_MS = 300;

function TracksSettingsScreen() {
  const { t } = useTranslation("handprint");

  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: tracks, isLoading: tracksLoading } = useTracks();
  const { isEnabled, setEnabled } = useTrackEnablement();

  const [searchParams, setSearchParams] = useSearchParams();
  const [queryInput, setQueryInput] = React.useState(
    () => searchParams.get(TRACK_FILTER_QUERY_PARAM) ?? "",
  );
  // The last `q` this component put in the URL, which is what lets the sync effect below tell a history navigation apart from the lagging echo of its own debounced write.
  const lastWrittenQuery = React.useRef(queryInput);

  const [selectedTrack, setSelectedTrack] = React.useState<TrackInfo | null>(
    null,
  );
  const [showAddTrackModal, setShowAddTrackModal] = React.useState(false);
  const [isFiltersModalOpen, setIsFiltersModalOpen] = React.useState(false);

  const isLoading = settingsLoading || tracksLoading || !settings;
  const allTracks = tracks ?? [];

  const filter = React.useMemo<TrackFilterState>(
    () => ({ ...parseTrackFilterState(searchParams), query: queryInput }),
    [searchParams, queryInput],
  );

  const groups = React.useMemo(
    () => buildTrackFacetGroups(allTracks, isEnabled, filter),
    [allTracks, isEnabled, filter],
  );

  const visibleTracks = React.useMemo(
    () => applyTrackFilters(allTracks, isEnabled, filter),
    [allTracks, isEnabled, filter],
  );

  const activeFilterCount = countActiveFilters(filter);

  // Back and forward move `q` under a route that stays mounted, so the input has to take the URL's value back or it would keep showing — and debounce back — a query the user has already navigated away from.
  React.useEffect(() => {
    const current = searchParams.get(TRACK_FILTER_QUERY_PARAM) ?? "";
    if (current === lastWrittenQuery.current) return;
    lastWrittenQuery.current = current;
    setQueryInput(current);
  }, [searchParams]);

  // The search input owns its value and the URL only mirrors it, debounced: writing on every keystroke would push a history entry per character, and reading `q` back out mid-typing would bounce a stale value into the input.
  React.useEffect(() => {
    const current = searchParams.get(TRACK_FILTER_QUERY_PARAM) ?? "";
    if (current === queryInput) return undefined;

    const timeout = setTimeout(() => {
      lastWrittenQuery.current = queryInput;
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);
          if (queryInput) {
            next.set(TRACK_FILTER_QUERY_PARAM, queryInput);
          } else {
            next.delete(TRACK_FILTER_QUERY_PARAM);
          }
          return next;
        },
        { replace: true },
      );
    }, SEARCH_URL_SYNC_DELAY_MS);

    return () => clearTimeout(timeout);
  }, [queryInput, searchParams, setSearchParams]);

  const handleFilterChange = (next: TrackFilterState) => {
    if (next.query !== filter.query) setQueryInput(next.query);

    // Compare facets only, so a pure query change does not bypass the debounce.
    const facetsChanged =
      toTrackFilterSearchParams({ ...next, query: "" }).toString() !==
      toTrackFilterSearchParams({ ...filter, query: "" }).toString();
    if (facetsChanged) setSearchParams(toTrackFilterSearchParams(next));
  };

  const handleToggleFacet = (groupId: TrackFacetGroupId, value: string) =>
    handleFilterChange(toggleTrackFilterValue(filter, groupId, value));

  const handleClearFacets = () =>
    handleFilterChange(clearTrackFilterFacets(filter));

  return (
    <div
      data-testid="tracks-settings-screen"
      className="flex h-full gap-4 lg:gap-10 lg:pl-10"
    >
      <ExtensionsNavigation />
      <main className={cn(settingsLikeMainScrollClassName, "h-full")}>
        <div
          data-testid="tracks-page"
          className="mx-auto flex w-full min-w-0 max-w-275 flex-col gap-6"
        >
          <div className="flex min-w-0 items-start justify-between gap-4">
            <div className="min-w-0 space-y-1">
              <h2 className="text-xl font-semibold leading-6 text-foreground">
                {t(I18nKey.SETTINGS$TRACKS_TITLE)}
              </h2>
              <div
                data-testid="tracks-settings-description"
                className="max-w-2xl text-sm text-tertiary-light"
              >
                {t(I18nKey.SETTINGS$TRACKS_PAGE_DESCRIPTION)}
              </div>
              <div
                data-testid="tracks-new-conversation-notice"
                className="max-w-2xl text-xs text-tertiary-alt"
              >
                {t(I18nKey.SETTINGS$TRACKS_NEW_CONVERSATION_NOTICE)}
              </div>
            </div>
            <BrandButton
              type="button"
              variant="secondary"
              testId="tracks-add-track-button"
              className="flex-shrink-0 whitespace-nowrap"
              onClick={() => setShowAddTrackModal(true)}
            >
              {t(I18nKey.SETTINGS$TRACKS_ADD_BUTTON)}
            </BrandButton>
          </div>

          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 rounded-2xl bg-tertiary animate-pulse"
                />
              ))}
            </div>
          ) : null}

          {!isLoading && allTracks.length === 0 ? (
            <div
              data-testid="tracks-empty"
              className={extensionModuleEmptyStateClassName}
            >
              <p className="text-sm text-tertiary-light">
                {t(I18nKey.SETTINGS$TRACKS_NO_TRACKS)}
              </p>
            </div>
          ) : null}

          {!isLoading && allTracks.length > 0 ? (
            <>
              <TracksToolbar
                search={filter.query}
                onSearchChange={(query) =>
                  handleFilterChange({ ...filter, query })
                }
                activeFilterCount={activeFilterCount}
                onOpenFilters={() => setIsFiltersModalOpen(true)}
              />

              <div className="flex min-w-0 gap-6">
                <TrackFacetRail
                  groups={groups}
                  onToggle={handleToggleFacet}
                  className="hidden w-60 shrink-0 self-start md:flex"
                />

                <section className="flex min-w-0 flex-1 flex-col gap-3">
                  <div className="flex items-center justify-between gap-3 text-xs text-tertiary-light">
                    <span data-testid="tracks-result-summary">
                      {t(I18nKey.SETTINGS$TRACKS_RESULT_COUNT, {
                        count: visibleTracks.length,
                      })}
                    </span>
                    {activeFilterCount > 0 ? (
                      <button
                        type="button"
                        data-testid="tracks-clear-filters"
                        onClick={handleClearFacets}
                        className="cursor-pointer underline hover:text-contrast"
                      >
                        {t(I18nKey.SETTINGS$TRACKS_CLEAR_FILTERS)}
                      </button>
                    ) : null}
                  </div>

                  {visibleTracks.length === 0 ? (
                    <div
                      data-testid="tracks-no-match"
                      className={extensionModuleEmptyStateClassName}
                    >
                      <p className="text-sm text-tertiary-light">
                        {t(I18nKey.SETTINGS$TRACKS_NO_MATCH)}
                      </p>
                    </div>
                  ) : (
                    <div
                      className={cn(extensionModuleCardGridContainerClassName)}
                    >
                      <div className={extensionModuleCardGridClassName}>
                        {visibleTracks.map((track) => (
                          <TrackCard
                            key={track.name}
                            track={track}
                            enabled={isEnabled(track)}
                            onOpen={() => setSelectedTrack(track)}
                            onToggle={(enabled) =>
                              setEnabled(track.name, enabled)
                            }
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              </div>

              {isFiltersModalOpen ? (
                <TrackFiltersModal
                  groups={groups}
                  activeCount={activeFilterCount}
                  onToggle={handleToggleFacet}
                  onClearAll={handleClearFacets}
                  onClose={() => setIsFiltersModalOpen(false)}
                />
              ) : null}
            </>
          ) : null}
        </div>

        {selectedTrack && (
          <TrackDetailModal
            track={selectedTrack}
            enabled={isEnabled(selectedTrack)}
            onToggle={(enabled) => setEnabled(selectedTrack.name, enabled)}
            onClose={() => setSelectedTrack(null)}
          />
        )}

        {showAddTrackModal && (
          <AddTrackModal onClose={() => setShowAddTrackModal(false)} />
        )}
      </main>
    </div>
  );
}

export default TracksSettingsScreen;
