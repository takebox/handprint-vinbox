import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  CirclePlusBadge,
  CirclePlusCheckToggle,
} from "#/components/shared/buttons/circle-plus-check-toggle";

describe("CirclePlusBadge", () => {
  it("renders a decorative plus with hover styles and tooltip", () => {
    render(<CirclePlusBadge testId="automation-plus" />);

    const plusBadge = screen.getByTestId("automation-plus");
    expect(plusBadge.tagName).toBe("SPAN");
    expect(plusBadge).toHaveAttribute("aria-hidden", "true");
    expect(plusBadge.className).toContain("hover:bg-interactive-hover");
    expect(plusBadge.className).not.toContain("group-hover/card");
  });
});

describe("CirclePlusCheckToggle", () => {
  it("toggles between plus and checkmark states", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();

    const { rerender } = render(
      <CirclePlusCheckToggle
        testId="track-toggle"
        isSelected={false}
        onToggle={onToggle}
      />,
    );

    const toggle = screen.getByTestId("track-toggle");
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(toggle).toHaveAttribute(
      "aria-label",
      "SETTINGS$TRACKS_ENABLE_TRACK",
    );

    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(true);

    rerender(
      <CirclePlusCheckToggle
        testId="track-toggle"
        isSelected
        onToggle={onToggle}
      />,
    );

    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(toggle).toHaveAttribute(
      "aria-label",
      "SETTINGS$TRACKS_DISABLE_TRACK",
    );

    await user.click(toggle);
    expect(onToggle).toHaveBeenCalledWith(false);
  });

  it("shows a remove icon on hover when selected", async () => {
    const user = userEvent.setup();

    render(
      <CirclePlusCheckToggle
        testId="track-toggle"
        isSelected
        onToggle={vi.fn()}
      />,
    );

    const toggle = screen.getByTestId("track-toggle");
    expect(toggle).toHaveAttribute("data-showing-remove", "false");
    expect(toggle.className).toContain("border-contrast");
    expect(toggle.className).not.toContain("bg-contrast");

    await user.hover(toggle);
    expect(toggle).toHaveAttribute("data-showing-remove", "true");

    await user.unhover(toggle);
    expect(toggle).toHaveAttribute("data-showing-remove", "false");
  });

  it("does not show remove styling for keyboard focus alone", () => {
    render(
      <CirclePlusCheckToggle
        testId="track-toggle"
        isSelected
        onToggle={vi.fn()}
      />,
    );

    const toggle = screen.getByTestId("track-toggle");
    toggle.focus();

    expect(toggle).toHaveAttribute("data-showing-remove", "false");
  });

  it("stops click propagation for nested card handlers", async () => {
    const user = userEvent.setup();
    const onCardClick = vi.fn();
    const onToggle = vi.fn();

    render(
      <div role="button" tabIndex={0} onClick={onCardClick}>
        <CirclePlusCheckToggle
          testId="track-toggle"
          isSelected={false}
          onToggle={onToggle}
        />
      </div>,
    );

    await user.click(screen.getByTestId("track-toggle"));

    expect(onToggle).toHaveBeenCalledWith(true);
    expect(onCardClick).not.toHaveBeenCalled();
  });
});
