import HandprintLogo from "#/assets/branding/handprint-logo.svg?react";
import TerminalIcon from "#/icons/terminal.svg?react";
import {
  HAIJUN_CODE_MARK_PATH,
  HAIJUN_CODE_VIEWBOX,
  CODEX_MARK_PATH,
  CODEX_VIEWBOX,
  GEMINI_MARK_PATH,
  GEMINI_VIEWBOX,
} from "#/constants/acp-brand-marks";
import type { ACPProviderIcon } from "#/constants/acp-providers";
import { cn } from "#/utils/utils";

/**
 * Icons the conversation chip + onboarding tiles can render. Strictly broader
 * than {@link ACPProviderIcon} — that type covers ACP CLI subprocesses only
 * (Haijun Code, Codex, Gemini, generic terminal fallback), whereas this type
 * additionally includes the native Handprint harness.
 */
export type AgentBrandIconKind = "handprint" | ACPProviderIcon;

// The Handprint wordmark renders at a 3:2 (width:height) ratio. Kept as a
// named constant so the conversation chip and the onboarding tile (24×16)
// stay visually identical — see ``AgentOptionIcon`` in choose-agent-step.tsx.
const HANDPRINT_LOGO_ASPECT_RATIO = 3 / 2;

interface AgentBrandIconProps {
  kind: AgentBrandIconKind;
  size?: number;
  className?: string;
  "data-testid"?: string;
}

export function AgentBrandIcon({
  kind,
  size = 12,
  className,
  "data-testid": testId,
}: AgentBrandIconProps) {
  if (kind === "handprint") {
    // The shipped SVG draws the wordmark with ``fill="white"`` paths but
    // leaves the two hand shapes as ``fill="transparent"`` (negative space).
    // Recolor only the non-transparent paths to ``currentColor`` so the logo
    // inherits the chip's text color *without* filling in the hands — a
    // blanket ``[&_path]`` selector turns the whole mark into a solid blob.
    return (
      <HandprintLogo
        width={Math.round(size * HANDPRINT_LOGO_ASPECT_RATIO)}
        height={size}
        className={cn(
          "shrink-0 [&_path:not([fill=transparent])]:fill-current",
          className,
        )}
        data-testid={testId ?? "agent-brand-icon-handprint"}
        aria-hidden
      />
    );
  }
  if (kind === "haijun-code") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={HAIJUN_CODE_VIEWBOX}
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        data-testid={testId ?? "agent-brand-icon-haijun-code"}
        aria-hidden
      >
        <path fill="currentColor" d={HAIJUN_CODE_MARK_PATH} />
      </svg>
    );
  }
  if (kind === "codex") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={CODEX_VIEWBOX}
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        data-testid={testId ?? "agent-brand-icon-codex"}
        aria-hidden
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d={CODEX_MARK_PATH}
          fill="currentColor"
        />
      </svg>
    );
  }
  if (kind === "gemini") {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox={GEMINI_VIEWBOX}
        width={size}
        height={size}
        className={cn("shrink-0", className)}
        data-testid={testId ?? "agent-brand-icon-gemini"}
        aria-hidden
      >
        <path fill="currentColor" d={GEMINI_MARK_PATH} />
      </svg>
    );
  }
  return (
    <TerminalIcon
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      data-testid={testId ?? "agent-brand-icon-generic"}
      aria-hidden
    />
  );
}
