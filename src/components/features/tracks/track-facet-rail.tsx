import type { TrackCategoryId } from "@handprint-ai/extensions/tracks";
import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "#/utils/utils";
import { TRACK_CATEGORY_ICONS } from "#/utils/track-category";
import { TrackFacetRow } from "./track-facet-row";
import type { TrackFacetGroup, TrackFacetGroupId } from "./track-filter";

interface TrackFacetRailProps {
  groups: TrackFacetGroup[];
  onToggle: (groupId: TrackFacetGroupId, value: string) => void;
  className?: string;
}

/** Only the category group carries an icon; the rest are plain rows. */
function iconFor(
  groupId: TrackFacetGroupId,
  value: string,
): LucideIcon | undefined {
  if (groupId !== "category") return undefined;
  return TRACK_CATEGORY_ICONS[value as TrackCategoryId];
}

export function TrackFacetRail({
  groups,
  onToggle,
  className,
}: TrackFacetRailProps) {
  const { t } = useTranslation("handprint");

  if (groups.length === 0) return null;

  return (
    <div
      data-testid="track-facet-rail"
      className={cn("flex min-w-0 flex-col gap-5", className)}
    >
      {groups.map((group) => {
        const titleId = `track-facet-group-${group.id}-title`;
        return (
          <div
            key={group.id}
            data-testid={`track-facet-group-${group.id}`}
            role="group"
            aria-labelledby={titleId}
            className="flex flex-col gap-1.5"
          >
            <span
              id={titleId}
              className="px-1 text-[11px] font-semibold uppercase tracking-wider text-tertiary-alt"
            >
              {t(group.labelKey)}
            </span>
            {group.rows.map((row) => (
              <TrackFacetRow
                key={row.value}
                testId={`track-facet-${group.id}-${row.value}`}
                labelKey={row.labelKey}
                count={row.count}
                checked={row.checked}
                disabled={row.disabled}
                icon={iconFor(group.id, row.value)}
                onToggle={() => onToggle(group.id, row.value)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}
