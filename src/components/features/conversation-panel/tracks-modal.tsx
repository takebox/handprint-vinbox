import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ModalBackdrop } from "#/components/shared/modals/modal-backdrop";
import {
  MODAL_MAX_WIDTH_VIEWPORT,
  ModalBody,
} from "#/components/shared/modals/modal-body";
import { I18nKey } from "#/i18n/declaration";
import { getAgentServerWorkingDir } from "#/api/agent-server-config";
import { useConversationTracks } from "#/hooks/query/use-conversation-tracks";
import { useTrackEnabledFilter } from "#/hooks/use-track-enablement";
import {
  groupTracksByScope,
  TRACK_SCOPE_ORDER,
  type TrackScope,
} from "#/utils/track-scope";
import { cn } from "#/utils/utils";
import { TracksModalHeader } from "./tracks-modal-header";
import { TracksModalSection } from "./tracks-modal-section";
import { TracksLoadingState } from "./tracks-loading-state";
import { TracksEmptyState } from "./tracks-empty-state";
import { TrackItem } from "./track-item";

interface TracksModalProps {
  onClose: () => void;
}

const SECTION_TITLE_KEY: Record<TrackScope, I18nKey> = {
  project: I18nKey.TRACKS_MODAL$SECTION_PROJECT,
  personal: I18nKey.TRACKS_MODAL$SECTION_USER,
  public: I18nKey.TRACKS_MODAL$SECTION_PUBLIC,
};

export function TracksModal({ onClose }: TracksModalProps) {
  const { t } = useTranslation("handprint");
  const projectDir = getAgentServerWorkingDir();
  const [expandedAgents, setExpandedAgents] = useState<Record<string, boolean>>(
    {},
  );
  // Scope the catalog to this conversation's attached workspace so the listed
  // tracks match the project tracks actually loaded into the conversation.
  const {
    data: tracks,
    isLoading,
    isError,
    refetch,
    isRefetching,
  } = useConversationTracks();
  const isTrackEnabled = useTrackEnabledFilter();

  // The modal reports what the conversation actually has, so it lists the
  // enabled set rather than the whole catalog.
  const visibleTracks = useMemo(
    () => (tracks ?? []).filter(isTrackEnabled),
    [tracks, isTrackEnabled],
  );

  const groupedTracks = useMemo(
    () => groupTracksByScope(visibleTracks, projectDir),
    [visibleTracks, projectDir],
  );

  const toggleAgent = (agentName: string) => {
    setExpandedAgents((prev) => ({
      ...prev,
      [agentName]: !prev[agentName],
    }));
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <ModalBody
        width="lg"
        className={cn(
          "relative max-h-[80vh] flex flex-col items-start border border-border",
          MODAL_MAX_WIDTH_VIEWPORT,
        )}
        testID="tracks-modal"
      >
        <TracksModalHeader
          isLoading={isLoading}
          isRefetching={isRefetching}
          onRefresh={refetch}
          onClose={onClose}
        />

        <div className="w-full h-[60vh] overflow-auto rounded-md border border-border bg-surface-raised custom-scrollbar-always">
          {isLoading ? (
            <TracksLoadingState />
          ) : isError || !tracks || visibleTracks.length === 0 ? (
            <TracksEmptyState isError={isError} />
          ) : (
            groupedTracks && (
              <div className="divide-y divide-border">
                {TRACK_SCOPE_ORDER.map((scope) => {
                  const scopedTracks = groupedTracks[scope];
                  if (scopedTracks.length === 0) {
                    return null;
                  }

                  return (
                    <TracksModalSection
                      key={scope}
                      title={t(SECTION_TITLE_KEY[scope])}
                      count={scopedTracks.length}
                    >
                      {scopedTracks.map((track) => {
                        const isExpanded = expandedAgents[track.name] || false;

                        return (
                          <TrackItem
                            key={`${scope}-${track.name}`}
                            track={track}
                            isExpanded={isExpanded}
                            onToggle={toggleAgent}
                          />
                        );
                      })}
                    </TracksModalSection>
                  );
                })}
              </div>
            )
          )}
        </div>
      </ModalBody>
    </ModalBackdrop>
  );
}
