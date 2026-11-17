import type { ReactNode } from "react";
import { Typography } from "#/ui/typography";

interface TracksModalSectionProps {
  title: string;
  count: number;
  children: ReactNode;
}

export function TracksModalSection({
  title,
  count,
  children,
}: TracksModalSectionProps) {
  return (
    <section className="w-full">
      <div className="sticky top-0 z-10 border-b border-border bg-surface-raised px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Typography.Text className="text-xs font-medium tracking-[0.01em] text-tertiary-light">
            {title}
          </Typography.Text>
          <span className="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium leading-4 border border-border bg-surface text-tertiary-light">
            {count}
          </span>
        </div>
      </div>
      <div className="divide-y divide-border">{children}</div>
    </section>
  );
}
