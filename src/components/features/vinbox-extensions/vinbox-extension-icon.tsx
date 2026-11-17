import React from "react";
import { PanelsTopLeft } from "lucide-react";
import { useVinboxExtensionIcon } from "#/hooks/query/use-vinbox-extension-icon";
import type { InstalledVinboxExtensionInfo } from "#/types/vinbox-extension";

interface VinboxExtensionIconProps {
  extension: InstalledVinboxExtensionInfo;
  size: number;
  className?: string;
}

// Rendered via <img> (never inlined) so the SVG cannot run scripts.
export function VinboxExtensionIcon({
  extension,
  size,
  className,
}: VinboxExtensionIconProps) {
  const { data: icon } = useVinboxExtensionIcon(
    extension.name,
    Boolean(extension.manifest?.icon),
  );
  const [src, setSrc] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!icon) return undefined;
    const url = URL.createObjectURL(icon);
    setSrc(url);
    return () => {
      URL.revokeObjectURL(url);
      setSrc(null);
    };
  }, [icon]);

  if (!src) {
    return (
      <PanelsTopLeft
        width={size}
        height={size}
        className={className}
        aria-hidden
        data-testid="vinbox-extension-default-icon"
      />
    );
  }

  return (
    <img
      src={src}
      width={size}
      height={size}
      alt=""
      aria-hidden
      className={className}
      data-testid="vinbox-extension-icon"
      onError={() => setSrc(null)}
    />
  );
}
