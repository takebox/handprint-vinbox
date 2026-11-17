import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "test-utils";
import {
  TRACK_CARD_PILL_CLASS,
  TrackCardPillRow,
} from "#/components/features/tracks/track-card-pill-row";

describe("TrackCardPillRow", () => {
  const observedCallbacks: ResizeObserverCallback[] = [];

  beforeEach(() => {
    observedCallbacks.length = 0;
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(cb: ResizeObserverCallback) {
          observedCallbacks.push(cb);
        }

        observe() {
          const cb = observedCallbacks[observedCallbacks.length - 1];
          cb?.([], this as unknown as ResizeObserver);
        }

        disconnect() {}

        unobserve() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function stubWidths(containerWidth: number, pillWidth: number) {
    const row = screen.getByTestId("track-triggers-test");
    Object.defineProperty(row, "clientWidth", {
      configurable: true,
      get: () => containerWidth,
    });

    const measure = row
      .closest('[data-testid="track-triggers-test-wrap"]')
      ?.querySelector('[aria-hidden="true"]') as HTMLElement;
    Array.from(measure.children).forEach((child) => {
      Object.defineProperty(child, "offsetWidth", {
        configurable: true,
        get: () => pillWidth,
      });
    });

    act(() => {
      for (const cb of observedCallbacks) {
        cb([], {} as ResizeObserver);
      }
    });
  }

  const pills = [
    {
      id: "event-trigger",
      node: (
        <span className={TRACK_CARD_PILL_CLASS}>
          pull_request_review_comment.created (github)
        </span>
      ),
    },
    {
      id: "model",
      node: <span className={TRACK_CARD_PILL_CLASS}>review-fast</span>,
    },
  ];

  it("keeps pills on a single nowrap row with overflow handling", () => {
    renderWithProviders(
      <TrackCardPillRow testId="track-triggers-test" pills={pills} />,
    );

    const row = screen.getByTestId("track-triggers-test");
    expect(row).toHaveClass("flex-nowrap");
    expect(row).toHaveClass("overflow-hidden");
    expect(row).not.toHaveClass("flex-wrap");
  });

  it("folds pills that do not fit into a +N popover", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TrackCardPillRow testId="track-triggers-test" pills={pills} />,
    );

    // Wide enough for one 80px pill + overflow reserve, not two.
    stubWidths(130, 80);

    await waitFor(() => {
      expect(
        screen.getByTestId("track-triggers-test-overflow"),
      ).toBeInTheDocument();
    });

    expect(screen.getByTestId("track-triggers-test")).toHaveTextContent(
      "pull_request_review_comment.created (github)",
    );
    expect(screen.getByTestId("track-triggers-test")).not.toHaveTextContent(
      "review-fast",
    );

    const overflow = screen.getByTestId("track-triggers-test-overflow");
    expect(overflow).toHaveAttribute(
      "aria-label",
      "SETTINGS$TRACKS_PILLS_OVERFLOW_ARIA",
    );

    await user.click(overflow);

    const popover = screen.getByTestId("track-triggers-test-overflow-popover");
    expect(popover.parentElement).toBe(document.body);
    expect(
      within(popover).getByTestId("track-triggers-test-overflow-item"),
    ).toHaveTextContent("review-fast");
  });

  it("opens the overflow popover without activating a wrapping card", async () => {
    const user = userEvent.setup();
    const onActivate = vi.fn();

    renderWithProviders(
      <div
        role="link"
        tabIndex={0}
        onClick={onActivate}
        onKeyDown={(event) => {
          if (event.key === "Enter") onActivate();
        }}
      >
        <TrackCardPillRow testId="track-triggers-test" pills={pills} />
      </div>,
    );

    stubWidths(130, 80);

    await waitFor(() => {
      expect(
        screen.getByTestId("track-triggers-test-overflow"),
      ).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("track-triggers-test-overflow"));

    expect(
      screen.getByTestId("track-triggers-test-overflow-popover"),
    ).toBeInTheDocument();
    expect(onActivate).not.toHaveBeenCalled();
  });

  it("anchors the overflow popover below the +N pill", async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <TrackCardPillRow testId="track-triggers-test" pills={pills} />,
    );

    stubWidths(130, 80);

    await waitFor(() => {
      expect(
        screen.getByTestId("track-triggers-test-overflow"),
      ).toBeInTheDocument();
    });

    const overflow = screen.getByTestId("track-triggers-test-overflow");
    vi.spyOn(overflow, "getBoundingClientRect").mockReturnValue({
      x: 200,
      y: 100,
      top: 100,
      bottom: 118,
      left: 200,
      right: 236,
      width: 36,
      height: 18,
      toJSON: () => ({}),
    });

    await user.click(overflow);

    const popover = screen.getByTestId("track-triggers-test-overflow-popover");
    expect(popover).toHaveStyle({
      position: "fixed",
      top: "122px",
      left: "200px",
    });
  });
});
