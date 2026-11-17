import { ChevronDown, ChevronRight } from "lucide-react";
import { Typography } from "#/ui/typography";
import { TrackTriggers } from "./track-triggers";
import { TrackContent } from "./track-content";
import { TrackInfo } from "#/types/settings";

interface TrackItemProps {
  track: TrackInfo & { content?: string };
  isExpanded: boolean;
  onToggle: (agentName: string) => void;
}

const TRACK_TYPE_LABEL: Record<TrackInfo["type"], string> = {
  knowledge: "Knowledge",
  repo: "Repository",
  agenttracks: "AgentTracks",
};

const TRACK_PILL_CLASS =
  "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 border border-border bg-surface text-tertiary-light";

export function TrackItem({ track, isExpanded, onToggle }: TrackItemProps) {
  return (
    <div>
      <button
        type="button"
        onClick={() => onToggle(track.name)}
        className="w-full py-3 px-3 text-left flex items-center justify-between hover:bg-tertiary transition-colors"
      >
        <div className="flex items-center">
          <Typography.Text className="font-bold text-content-2">
            {track.name}
          </Typography.Text>
        </div>
        <div className="flex items-center gap-2">
          <span className={TRACK_PILL_CLASS}>
            {TRACK_TYPE_LABEL[track.type]}
          </span>
          <Typography.Text className="text-text-tertiary">
            {isExpanded ? (
              <ChevronDown size={18} />
            ) : (
              <ChevronRight size={18} />
            )}
          </Typography.Text>
        </div>
      </button>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-border">
          <TrackTriggers triggers={track.triggers ?? []} />
          <TrackContent content={track.content ?? ""} />
        </div>
      )}
    </div>
  );
}
