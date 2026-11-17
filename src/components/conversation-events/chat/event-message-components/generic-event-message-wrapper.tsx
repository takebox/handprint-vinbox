import {
  HandprintEvent,
  ActionEvent,
  ObservationEvent,
} from "#/types/agent-server/core";
import { InvokeTrackObservation } from "#/types/agent-server/core/base/observation";
import { I18nKey } from "#/i18n/declaration";
import { GenericEventMessage } from "../../../features/chat/generic-event-message";
import { getEventContent } from "../event-content-helpers/get-event-content";
import {
  getACPToolCallResult,
  getObservationResult,
  ObservationResultStatus,
} from "../event-content-helpers/get-observation-result";
import {
  isACPToolCallEvent,
  isObservationEvent,
} from "#/types/agent-server/type-guards";
import {
  TrackReadyEvent,
  TrackReadyItem,
  isTrackReadyEvent,
} from "../event-content-helpers/create-track-ready-event";
import { getInvokeTrackItems } from "../event-content-helpers/get-invoke-track-items";
import { TrackReadyContentList } from "./track-ready-content-list";
import TracksIcon from "#/icons/tracks.svg?react";
import { isMarkdownFileEditorEvent } from "#/components/features/chat/tool-visualizers/primitives/markdown-file-preview";

interface GenericEventMessageWrapperProps {
  event: HandprintEvent | TrackReadyEvent;
  isLastMessage: boolean;
  correspondingAction?: ActionEvent;
}

/**
 * Resolves the expandable track-knowledge list shared by Track Ready events and
 * invoke-track tool observations. Returns the list items and their header
 * label, or null when the event carries no track knowledge (so the caller keeps
 * the default details body). Additional track-knowledge sources slot in as one
 * more branch here.
 */
function getTrackKnowledge(
  event: HandprintEvent | TrackReadyEvent,
): { items: TrackReadyItem[]; titleKey: I18nKey } | null {
  if (isTrackReadyEvent(event)) {
    return event._trackReadyItems.length > 0
      ? {
          items: event._trackReadyItems,
          titleKey: I18nKey.TRACKS$TRIGGERED_TRACK_KNOWLEDGE,
        }
      : null;
  }
  if (
    isObservationEvent(event) &&
    event.observation.kind === "InvokeTrackObservation"
  ) {
    const items = getInvokeTrackItems(
      event as ObservationEvent<InvokeTrackObservation>,
    );
    return items.length > 0
      ? { items, titleKey: I18nKey.TRACKS$INVOKED_TRACK_KNOWLEDGE }
      : null;
  }
  return null;
}

export function GenericEventMessageWrapper({
  event,
  correspondingAction,
}: GenericEventMessageWrapperProps) {
  const { title, details } = getEventContent(event, correspondingAction);

  // TaskTrackerObservation has its own rendering
  if (
    !isTrackReadyEvent(event) &&
    isObservationEvent(event) &&
    event.observation.kind === "TaskTrackerObservation"
  ) {
    return <div>{details}</div>;
  }

  // Determine success status
  let success: ObservationResultStatus | undefined;
  if (isTrackReadyEvent(event)) {
    success = "success";
  } else if (isObservationEvent(event)) {
    success = getObservationResult(event);
  } else if (isACPToolCallEvent(event)) {
    success = getACPToolCallResult(event);
  }

  // Track Ready events and invoke-track tool observations both render the
  // expandable track-knowledge list (with the tracks icon); they differ only in
  // the header label.
  const trackKnowledge = getTrackKnowledge(event);
  const bodyDetails = trackKnowledge ? (
    <TrackReadyContentList
      items={trackKnowledge.items}
      titleKey={trackKnowledge.titleKey}
    />
  ) : (
    details
  );

  // Markdown file-editor cards carry a clipped preview; expand them by
  // default so the artifact is visible without an extra chevron click.
  const initiallyExpanded =
    !isTrackReadyEvent(event) &&
    isMarkdownFileEditorEvent(event, correspondingAction);

  return (
    <div>
      <GenericEventMessage
        title={title}
        details={bodyDetails}
        success={success}
        initiallyExpanded={initiallyExpanded}
        timestamp={event.timestamp}
        titleIcon={
          trackKnowledge ? (
            <TracksIcon className="h-4 w-4 stroke-muted flex-shrink-0 mr-2" />
          ) : undefined
        }
      />
    </div>
  );
}
