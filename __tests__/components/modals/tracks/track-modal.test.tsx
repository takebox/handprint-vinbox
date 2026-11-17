import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderWithProviders } from "test-utils";
import { TracksModal } from "#/components/features/conversation-panel/tracks-modal";
import TracksService from "#/api/tracks-service";
import SettingsService from "#/api/settings-service/settings-service.api";
import { MOCK_DEFAULT_USER_SETTINGS } from "#/mocks/handlers";

describe("TracksModal", () => {
  const mockOnClose = vi.fn();

  const defaultProps = {
    onClose: mockOnClose,
  };

  const mockTracks = [
    {
      name: "Test Track 1",
      type: "repo" as const,
      source: null,
      triggers: ["test", "example"],
      content: "This is test content for track 1",
    },
    {
      name: "Test Track 2",
      type: "knowledge" as const,
      source: null,
      triggers: ["help", "support"],
      content: "This is test content for track 2",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(TracksService, "getTracks").mockResolvedValue(mockTracks);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Enabled tracks only", () => {
    // The modal reports what the conversation actually has, so a catalog track
    // left off the allow-list must not be listed as available.
    const CATALOG_ON = "add-track";
    const CATALOG_OFF = "add-javadoc";

    const catalogTrack = (name: string) => ({
      name,
      type: "knowledge" as const,
      source: "public",
      triggers: [],
      content: `content for ${name}`,
    });

    it("lists a catalog track on the allow-list and omits one that is off", async () => {
      vi.spyOn(TracksService, "getTracks").mockResolvedValue([
        catalogTrack(CATALOG_ON),
        catalogTrack(CATALOG_OFF),
      ]);
      vi.spyOn(SettingsService, "getSettings").mockResolvedValue({
        ...MOCK_DEFAULT_USER_SETTINGS,
        enabled_tracks: [CATALOG_ON],
        disabled_tracks: [],
      });

      renderWithProviders(<TracksModal {...defaultProps} />);

      expect(await screen.findByText(CATALOG_ON)).toBeInTheDocument();
      expect(screen.queryByText(CATALOG_OFF)).not.toBeInTheDocument();
    });
  });

  describe("Refresh Button Rendering", () => {
    it("should render the refresh button as an icon-only control with accessible label", async () => {
      renderWithProviders(<TracksModal {...defaultProps} />);

      const refreshButton = await screen.findByTestId("refresh-tracks");
      expect(refreshButton).toBeInTheDocument();
      expect(refreshButton).toHaveAttribute("aria-label", "BUTTON$REFRESH");
      expect(refreshButton).not.toHaveTextContent("BUTTON$REFRESH");
    });
  });

  describe("Close Button", () => {
    it("should render the close button and call onClose when clicked", async () => {
      const user = userEvent.setup();
      renderWithProviders(<TracksModal {...defaultProps} />);

      const closeButton = await screen.findByTestId("close-tracks-modal");
      expect(closeButton).toBeInTheDocument();

      await user.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("Refresh Button Functionality", () => {
    it("should call refetch when refresh button is clicked", async () => {
      const user = userEvent.setup();
      const refreshSpy = vi.spyOn(TracksService, "getTracks");

      renderWithProviders(<TracksModal {...defaultProps} />);

      const refreshButton = await screen.findByTestId("refresh-tracks");

      refreshSpy.mockClear();

      await user.click(refreshButton);

      expect(refreshSpy).toHaveBeenCalled();
    });
  });

  describe("Tracks Display", () => {
    it("displays the tracks catalog when opened with no active conversation (home page)", async () => {
      // Arrange: the catalog fetch succeeds; no conversation exists in this
      // render, so no runtime ever starts (the original infinite-spinner bug)
      vi.spyOn(TracksService, "getTracks").mockResolvedValue(mockTracks);

      // Act
      renderWithProviders(<TracksModal {...defaultProps} />);

      // Assert: the list renders instead of waiting for a runtime
      expect(await screen.findByText("Test Track 1")).toBeInTheDocument();
      expect(screen.getByText("Test Track 2")).toBeInTheDocument();
    });

    it("surfaces a fetch error message when the tracks catalog cannot be loaded", async () => {
      // Arrange: the catalog fetch fails (e.g. agent server unreachable)
      vi.spyOn(TracksService, "getTracks").mockRejectedValue(
        new Error("network error"),
      );

      // Act
      renderWithProviders(<TracksModal {...defaultProps} />);

      // Assert: a clear failure message is shown instead of an endless spinner
      expect(await screen.findByText("COMMON$FETCH_ERROR")).toBeInTheDocument();
    });
  });
});
