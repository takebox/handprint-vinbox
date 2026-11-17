import TracksIcon from "#/icons/tracks.svg?react";
import { cn } from "#/utils/utils";

interface TrackIconBadgeProps {
  trackName: string;
  className?: string;
}

export function TrackIconBadge({ trackName, className }: TrackIconBadgeProps) {
  return (
    <span
      aria-hidden="true"
      title={trackName}
      data-testid={`track-icon-${trackName}`}
      className={cn(
        "inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden",
        "rounded-lg border border-contrast/10 bg-surface-raised text-contrast",
        "shadow-[inset_0_1px_0_color-mix(in_srgb,var(--oh-contrast)_18%,transparent)]",
        "[&>svg]:h-5 [&>svg]:w-5",
        className,
      )}
    >
      <TracksIcon />
    </span>
  );
}
