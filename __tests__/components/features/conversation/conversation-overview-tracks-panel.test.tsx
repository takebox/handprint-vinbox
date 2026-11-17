import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConversationOverviewTracksPanel } from "#/components/features/conversation/conversation-overview-tracks-panel";
import SettingsService from "#/api/settings-service/settings-service.api";
import TracksService from "#/api/tracks-service";
import { MOCK_DEFAULT_USER_SETTINGS } from "#/mocks/handlers";
import type { TrackInfo } from "#/types/settings";
import { ActiveBackendProvider } from "#/contexts/active-backend-context";

vi.mock("#/hooks/query/use-active-conversation", () => ({
  useActiveConversation: () => ({
    data: { selected_workspace: "/workspace/project/demo" },
  }),
}));

function buildTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    name: "deno",
    type: "knowledge",
    source: "/Users/test/.handprint/cache/tracks/public-tracks/tracks/deno/TRACK.md",
    description: "Use this track for Deno projects.",
    triggers: ["deno"],
    version: "1.0.0",
    license: "Apache-2.0",
    compatibility: null,
    metadata: null,
    allowed_tools: null,
    is_agenttracks_format: true,
    disable_model_invocation: false,
    ...overrides,
  };
}

function renderPanel(openAdd = false) {
  return render(<ConversationOverviewTracksPanel openAdd={openAdd} />, {
    wrapper: ({ children }) => (
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        <ActiveBackendProvider>{children}</ActiveBackendProvider>
      </QueryClientProvider>
    ),
  });
}

describe("ConversationOverviewTracksPanel", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      MOCK_DEFAULT_USER_SETTINGS,
    );
  });

  it("opens the add track modal when openAdd is true", async () => {
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([buildTrack()]);

    renderPanel(true);

    expect(await screen.findByTestId("add-track-modal")).toBeInTheDocument();
  });

  it("shows the empty state without an inline add track button", async () => {
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([]);

    renderPanel();

    expect(
      await screen.findByTestId("conversation-overview-tracks-empty"),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId("conversation-overview-tracks-add-track-button"),
    ).not.toBeInTheDocument();
  });

  it("defaults to this-project scope and can show all tracks", async () => {
    const user = userEvent.setup();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({
        name: "project-track",
        source: "/workspace/project/demo/.handprint/tracks/project/TRACK.md",
      }),
      buildTrack({ name: "public-track" }),
    ]);

    renderPanel();

    expect(
      await screen.findByTestId("conversation-overview-tracks-scope"),
    ).toBeInTheDocument();
    expect(await screen.findByText("project-track")).toBeInTheDocument();
    expect(screen.queryByText("public-track")).not.toBeInTheDocument();

    await user.click(
      screen.getByTestId("conversation-overview-tracks-scope-option-all"),
    );

    expect(await screen.findByText("public-track")).toBeInTheDocument();
    expect(screen.getByText("project-track")).toBeInTheDocument();
  });
});
