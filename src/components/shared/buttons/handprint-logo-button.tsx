import { useTranslation } from "react-i18next";
import HandprintLogo from "#/assets/branding/handprint-logo.svg?react";
import { NavigationLink } from "#/components/shared/navigation-link";
import { I18nKey } from "#/i18n/declaration";
import { cn } from "#/utils/utils";

const DEFAULT_LOGO_WIDTH = 46;
const DEFAULT_LOGO_HEIGHT = 30;

export type HandprintLogoButtonProps = {
  className?: string;
  /** Applied to the root `<svg>` (e.g. `max-w-none` so Tailwind preflight doesn’t clamp wide marks inside a narrow flex slot). */
  logoClassName?: string;
  logoWidth?: number;
  logoHeight?: number;
};

export function HandprintLogoButton({
  className,
  logoClassName,
  logoWidth = DEFAULT_LOGO_WIDTH,
  logoHeight = DEFAULT_LOGO_HEIGHT,
}: HandprintLogoButtonProps = {}) {
  const { t } = useTranslation("handprint");

  const ariaLabel = t(I18nKey.BRANDING$HANDPRINT_LOGO);

  return (
    <NavigationLink
      to="/conversations"
      aria-label={ariaLabel}
      className={cn(className)}
    >
      <HandprintLogo
        width={logoWidth}
        height={logoHeight}
        className={cn(
          "shrink-0 text-contrast [&_path[fill=white]]:fill-current",
          logoClassName,
        )}
      />
    </NavigationLink>
  );
}
