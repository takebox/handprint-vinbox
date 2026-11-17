import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight } from "lucide-react";
import { I18nKey } from "#/i18n/declaration";
import { Typography } from "#/ui/typography";
import { TrackReadyItem } from "../event-content-helpers/create-track-ready-event";
import { TrackItemExpanded } from "./track-item-expanded";

interface TrackReadyContentListProps {
  items: TrackReadyItem[];
  /**
   * Translation key for the list header. Defaults to the "Triggered Track
   * Knowledge:" label used by Track Ready events; invoke-track observations
   * pass "Invoked Track Knowledge:" instead.
   */
  titleKey?: I18nKey;
}

export function TrackReadyContentList({
  items,
  titleKey = I18nKey.TRACKS$TRIGGERED_TRACK_KNOWLEDGE,
}: TrackReadyContentListProps) {
  const { t } = useTranslation("handprint");
  const [expandedTracks, setExpandedTracks] = React.useState<
    Record<string, boolean>
  >({});

  const toggleTrack = (name: string) => {
    setExpandedTracks((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div className="flex flex-col gap-1 mt-1">
      <Typography.Text className="font-bold text-foreground text-sm px-2 py-1">
        {t(titleKey)}
      </Typography.Text>
      {items.map((item) => {
        const isExpanded = expandedTracks[item.name] || false;

        return (
          <div
            key={item.name}
            className="border border-border-subtle rounded-md overflow-hidden"
          >
            <button
              type="button"
              onClick={() => toggleTrack(item.name)}
              className="w-full py-1.5 px-2 text-left flex items-center gap-2 hover:bg-tertiary transition-colors cursor-pointer"
            >
              <Typography.Text className="text-text-tertiary">
                {isExpanded ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )}
              </Typography.Text>
              <Typography.Text className="font-normal text-foreground text-sm">
                {item.name}
              </Typography.Text>
            </button>

            {isExpanded && item.content && (
              <>
                <hr className="border-border-subtle" />
                <TrackItemExpanded content={item.content} />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
