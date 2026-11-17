import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouterProvider, createMemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TracksSettingsScreen from "#/routes/tracks-settings";
import SettingsService from "#/api/settings-service/settings-service.api";
import TracksService from "#/api/tracks-service";
import {
  ADD_TRACK_DOCS_URL,
  ADD_TRACK_EXAMPLE_COMMAND,
} from "#/constants/tracks-docs";
import { MOCK_DEFAULT_USER_SETTINGS } from "#/mocks/handlers";
import { Settings, TrackInfo } from "#/types/settings";
import { ActiveBackendProvider } from "#/contexts/active-backend-context";

const navigateMock = vi.fn();

vi.mock("#/context/navigation-context", () => ({
  useNavigation: () => ({
    navigate: navigateMock,
    currentPath: "/tracks",
    conversationId: null,
    isNavigating: false,
  }),
  NavigationProvider: ({ children }: { children: React.ReactNode }) => children,
}));

function buildSettings(overrides: Partial<Settings> = {}): Settings {
  return {
    ...MOCK_DEFAULT_USER_SETTINGS,
    ...overrides,
    agent_settings: {
      ...MOCK_DEFAULT_USER_SETTINGS.agent_settings,
      ...overrides.agent_settings,
    },
  };
}

function buildTrack(overrides: Partial<TrackInfo> = {}): TrackInfo {
  return {
    name: "deno",
    type: "knowledge",
    source:
      "/Users/test/.handprint/cache/tracks/public-tracks/tracks/deno/TRACK.md",
    description:
      "If the project uses deno, use this track to initialize Deno projects.",
    triggers: ["deno", "deno.json", "deno.lock"],
    version: "1.0.0",
    license: "Apache-2.0",
    compatibility: "Requires Deno 1.40+",
    metadata: null,
    allowed_tools: ["bash"],
    is_agenttracks_format: true,
    disable_model_invocation: false,
    ...overrides,
  };
}

function renderTracksSettingsScreen(initialEntry = "/tracks") {
  const router = createMemoryRouter(
    [
      {
        path: "/tracks",
        Component: () => (
          <ActiveBackendProvider>
            <TracksSettingsScreen />
          </ActiveBackendProvider>
        ),
      },
    ],
    { initialEntries: [initialEntry] },
  );

  render(<RouterProvider router={router} />, {
    wrapper: ({ children }) => (
      <QueryClientProvider
        client={
          new QueryClient({
            defaultOptions: { queries: { retry: false } },
          })
        }
      >
        {children}
      </QueryClientProvider>
    ),
  });

  return router;
}

describe("TracksSettingsScreen", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    navigateMock.mockReset();
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(buildSettings());
  });

  it("renders the description text inside the description badge", async () => {
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([]);

    renderTracksSettingsScreen();

    const description = await screen.findByTestId(
      "tracks-settings-description",
    );
    expect(description).toHaveTextContent("SETTINGS$TRACKS_PAGE_DESCRIPTION");
    expect(screen.getByText("NAV$CUSTOMIZE")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar-extensions-/tracks")).toHaveTextContent(
      "Tracks",
    );
    expect(screen.getByTestId("sidebar-extensions-/plugins")).toHaveTextContent(
      "Plugins",
    );
    expect(screen.getByTestId("sidebar-extensions-/mcp")).toHaveTextContent(
      "MCP Servers",
    );
  });

  it("shows card subtitle text from track content when description is omitted", async () => {
    const track = buildTrack({
      name: "SSH Microagent",
      description: null,
      content: `---
description: Connect and run commands on remote machines over SSH.
---
# SSH Microagent

Full track body.`,
      triggers: ["ssh"],
    });
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${track.name}`);

    expect(
      within(card).getByTestId(`track-description-${track.name}`),
    ).toHaveTextContent(
      "Connect and run commands on remote machines over SSH.",
    );
  });

  it("surfaces the YAML description under the card title with the source path beneath it", async () => {
    const track = buildTrack();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${track.name}`);

    expect(
      within(card).getByTestId(`track-description-${track.name}`),
    ).toHaveTextContent(track.description!);
    expect(
      within(card).getByTestId(`track-source-${track.name}`),
    ).toHaveTextContent(track.source!);
    expect(
      within(card).getByTestId(`track-icon-${track.name}`),
    ).toBeInTheDocument();
    expect(
      within(card).getByTestId("track-type-badge-knowledge"),
    ).toHaveTextContent("SETTINGS$TRACKS_TYPE_KNOWLEDGE");
  });

  it("copies the source path when the copy button is clicked", async () => {
    const user = userEvent.setup();
    const track = buildTrack();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText);
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${track.name}`);

    await user.click(
      within(card).getByTestId(`track-copy-source-${track.name}`),
    );

    expect(writeText).toHaveBeenCalledWith(track.source);
  });

  it("hides the copy button when the source is a scope label instead of a path", async () => {
    const track = buildTrack({ name: "add_repo_inst", source: "global" });
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${track.name}`);

    expect(
      within(card).getByTestId(`track-source-${track.name}`),
    ).toHaveTextContent("global");
    expect(
      within(card).queryByTestId(`track-copy-source-${track.name}`),
    ).not.toBeInTheDocument();
  });

  it("filters tracks by name, description, or trigger via the search input", async () => {
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: "deno", description: "Deno runtime helper" }),
      buildTrack({
        name: "vercel",
        description: "Preview deployment helper",
        triggers: ["vercel", "preview deployment"],
        source: "/tracks/vercel/TRACK.md",
      }),
    ]);

    renderTracksSettingsScreen();
    await screen.findByTestId("track-card-deno");

    fireEvent.change(screen.getByTestId("tracks-search-input"), {
      target: { value: "preview" },
    });

    expect(screen.queryByTestId("track-card-deno")).not.toBeInTheDocument();
    expect(screen.getByTestId("track-card-vercel")).toBeInTheDocument();
  });

  it("narrows the visible tracks when a facet row is selected", async () => {
    const user = userEvent.setup();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: "deno", type: "knowledge" }),
      buildTrack({
        name: "global-rules",
        type: "repo",
        triggers: [],
        source: "/tracks/global-rules.md",
      }),
    ]);

    const router = renderTracksSettingsScreen();
    await screen.findByTestId("track-card-deno");

    await user.click(screen.getByTestId("track-facet-type-repo"));

    expect(screen.queryByTestId("track-card-deno")).not.toBeInTheDocument();
    expect(screen.getByTestId("track-card-global-rules")).toBeInTheDocument();
    expect(router.state.location.search).toBe("?type=repo");
  });

  it("seeds the filter state from the URL on load", async () => {
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: "deno", category: "environment" }),
      buildTrack({ name: "prd", category: "writing", triggers: [] }),
    ]);

    renderTracksSettingsScreen("/tracks?category=writing");

    await screen.findByTestId("track-card-prd");
    expect(screen.queryByTestId("track-card-deno")).not.toBeInTheDocument();
  });

  it("restores the search text when history navigation changes the query", async () => {
    const user = userEvent.setup();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: "deno", type: "knowledge", description: "A helper" }),
      buildTrack({
        name: "global-rules",
        type: "repo",
        description: "A helper",
        triggers: [],
        source: "/tracks/global-rules.md",
      }),
    ]);

    const router = renderTracksSettingsScreen("/tracks?q=helper");
    await screen.findByTestId("track-card-deno");
    const search = screen.getByTestId("tracks-search-input");

    // Push a second entry, then drop the query from it, so going back lands on a URL whose `q` differs from the input.
    await user.click(screen.getByTestId("track-facet-type-repo"));
    fireEvent.change(search, { target: { value: "" } });
    await waitFor(() =>
      expect(router.state.location.search).toBe("?type=repo"),
    );

    await act(() => router.navigate(-1));

    await waitFor(() => expect(search).toHaveValue("helper"));
    expect(router.state.location.search).toBe("?q=helper");
  });

  it("filters through the mobile filters modal", async () => {
    const user = userEvent.setup();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: "deno", type: "knowledge" }),
      buildTrack({
        name: "global-rules",
        type: "repo",
        triggers: [],
        source: "/tracks/global-rules.md",
      }),
    ]);

    renderTracksSettingsScreen();
    await screen.findByTestId("track-card-deno");

    await user.click(screen.getByTestId("tracks-filters-button"));
    const modal = await screen.findByTestId("track-filters-modal");
    await user.click(within(modal).getByTestId("track-facet-type-repo"));

    expect(screen.queryByTestId("track-card-deno")).not.toBeInTheDocument();
    expect(screen.getByTestId("track-card-global-rules")).toBeInTheDocument();
  });

  it("opens a detail modal with full metadata when a track card is clicked", async () => {
    const user = userEvent.setup();
    const track = buildTrack({
      name: "rich",
      license: "MIT",
      compatibility: "Requires Python 3.11+",
      allowed_tools: ["bash", "execute_bash"],
      source: "/tracks/rich/TRACK.md",
    });
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${track.name}`);

    await user.click(card);

    const modal = await screen.findByTestId("track-detail-modal");
    expect(modal).toHaveAttribute("data-track-name", track.name);
    expect(
      within(modal).getByTestId(`track-modal-pill-${track.name}-license`),
    ).toHaveTextContent("MIT");
    expect(
      within(modal).getByTestId(`track-modal-pill-${track.name}-compatibility`),
    ).toHaveTextContent("Requires Python 3.11+");
    expect(
      within(modal).getByTestId(`track-modal-pill-${track.name}-tool-bash`),
    ).toHaveTextContent("bash");
    expect(
      within(modal).getByTestId(
        `track-modal-pill-${track.name}-tool-execute_bash`,
      ),
    ).toHaveTextContent("execute_bash");
    expect(
      within(modal).getByTestId(`track-modal-toggle-${track.name}`),
    ).toBeInTheDocument();
  });

  it("toggles a track from the detail modal", async () => {
    const user = userEvent.setup();
    const track = buildTrack({ name: "toggle-me" });
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${track.name}`);
    await user.click(card);

    const modal = await screen.findByTestId("track-detail-modal");
    expect(
      within(modal).getByText("SETTINGS$TRACKS_ENABLED"),
    ).toBeInTheDocument();

    await user.click(
      within(modal).getByTestId(`track-modal-toggle-${track.name}`),
    );

    expect(card).not.toHaveClass("opacity-70");
    expect(
      within(card).getByTestId(`track-toggle-${track.name}`),
    ).toHaveAttribute("aria-checked", "false");
    expect(
      within(modal).getByText("SETTINGS$TRACKS_DISABLED"),
    ).toBeInTheDocument();
  });

  it("saves disabled_tracks to the server when a track is toggled off and settings has no prior disabled_tracks field", async () => {
    // Reproduces the bug where disabled_tracks is absent from settings (undefined),
    // causing hasHydratedInitialSettings to never become true and the save to be silently skipped.
    const user = userEvent.setup();
    const track = buildTrack({ name: "save-me" });
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({ disabled_tracks: undefined }),
    );
    const saveSpy = vi
      .spyOn(SettingsService, "saveSettings")
      .mockResolvedValue(true);

    renderTracksSettingsScreen();
    await screen.findByTestId(`track-card-${track.name}`);
    const card = screen.getByTestId(`track-card-${track.name}`);

    await user.click(within(card).getByTestId(`track-toggle-${track.name}`));

    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ disabled_tracks: [track.name] }),
      ),
    );
  });

  it("saves an updated disabled list when a track is toggled off and settings already has disabled_tracks", async () => {
    const user = userEvent.setup();
    const track = buildTrack({ name: "another-track" });
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({ disabled_tracks: [] }),
    );
    const saveSpy = vi
      .spyOn(SettingsService, "saveSettings")
      .mockResolvedValue(true);

    renderTracksSettingsScreen();
    await screen.findByTestId(`track-card-${track.name}`);
    const card = screen.getByTestId(`track-card-${track.name}`);

    await user.click(within(card).getByTestId(`track-toggle-${track.name}`));

    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ disabled_tracks: [track.name] }),
      ),
    );
  });

  it("toggles a track from the card without opening the modal", async () => {
    const user = userEvent.setup();
    const track = buildTrack({ name: "card-toggle" });
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${track.name}`);

    await user.click(within(card).getByTestId(`track-toggle-${track.name}`));

    expect(card).not.toHaveClass("opacity-70");
    expect(
      within(card).getByTestId(`track-toggle-${track.name}`),
    ).toHaveAttribute("aria-checked", "false");
    expect(screen.queryByTestId("track-detail-modal")).not.toBeInTheDocument();
  });

  it("shows an empty-state message when no tracks match the current filters", async () => {
    const track = buildTrack();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([track]);

    renderTracksSettingsScreen();
    await screen.findByTestId(`track-card-${track.name}`);

    fireEvent.change(screen.getByTestId("tracks-search-input"), {
      target: { value: "no-such-track-xyz" },
    });

    expect(screen.getByTestId("tracks-no-match")).toBeInTheDocument();
  });

  it("opens the add track modal with docs link and closes it", async () => {
    const user = userEvent.setup();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([]);

    renderTracksSettingsScreen();
    await screen.findByTestId("tracks-add-track-button");

    await user.click(screen.getByTestId("tracks-add-track-button"));

    const modal = await screen.findByTestId("add-track-modal");
    expect(modal).toBeInTheDocument();
    expect(screen.getByTestId("add-track-modal-example")).toHaveTextContent(
      "/add-track https://github.com/HandPrint-AI/extensions/tree/main/tracks/code-review",
    );
    expect(screen.getByTestId("add-track-modal-docs-link")).toHaveAttribute(
      "href",
      ADD_TRACK_DOCS_URL,
    );

    await user.click(screen.getByTestId("add-track-modal-dismiss"));

    expect(screen.queryByTestId("add-track-modal")).not.toBeInTheDocument();
  });

  it("copies the example command from the add track modal", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(navigator.clipboard, "writeText").mockImplementation(writeText);
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([]);

    renderTracksSettingsScreen();
    await user.click(await screen.findByTestId("tracks-add-track-button"));
    await screen.findByTestId("add-track-modal");

    await user.click(screen.getByTestId("add-track-modal-example-copy"));

    expect(writeText).toHaveBeenCalledWith(ADD_TRACK_EXAMPLE_COMMAND);
  });
  // A track from the bundled `@handprint-ai/extensions` catalog: those are
  // governed by the `enabled_tracks` allow-list, not the deny-list.
  const CATALOG_RECOMMENDED = "add-track";
  const CATALOG_OPTIONAL = "add-javadoc";

  it("shows the notice that track changes only reach new conversations", async () => {
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([]);

    renderTracksSettingsScreen();

    expect(
      await screen.findByTestId("tracks-new-conversation-notice"),
    ).toHaveTextContent("SETTINGS$TRACKS_NEW_CONVERSATION_NOTICE");
  });

  it("badges a catalog track the catalog recommends", async () => {
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: CATALOG_RECOMMENDED }),
      buildTrack({ name: CATALOG_OPTIONAL }),
    ]);

    renderTracksSettingsScreen();
    await screen.findByTestId(`track-card-${CATALOG_RECOMMENDED}`);

    expect(
      screen.getByTestId(`track-recommended-${CATALOG_RECOMMENDED}`),
    ).toHaveTextContent("SETTINGS$TRACKS_RECOMMENDED");
    expect(
      screen.queryByTestId(`track-recommended-${CATALOG_OPTIONAL}`),
    ).not.toBeInTheDocument();
  });

  it("renders an unlisted catalog track as off without it being denied", async () => {
    // The reported bug: everything in the catalog arrived switched on.
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: CATALOG_OPTIONAL }),
    ]);
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({ enabled_tracks: undefined, disabled_tracks: [] }),
    );

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${CATALOG_OPTIONAL}`);

    expect(
      within(card).getByTestId(`track-toggle-${CATALOG_OPTIONAL}`),
    ).toHaveAttribute("aria-checked", "false");
  });

  it("writes nothing back when the user toggles nothing", async () => {
    // Persisting the hydrated state on mount would race the one-shot migration
    // and could narrow a workspace it had just preserved.
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: CATALOG_OPTIONAL }),
    ]);
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({ enabled_tracks: undefined, disabled_tracks: [] }),
    );
    const saveSpy = vi
      .spyOn(SettingsService, "saveSettings")
      .mockResolvedValue(true);

    renderTracksSettingsScreen();
    await screen.findByTestId(`track-card-${CATALOG_OPTIONAL}`);
    await waitFor(() =>
      expect(screen.getByTestId("tracks-result-summary")).toBeInTheDocument(),
    );

    expect(saveSpy).not.toHaveBeenCalled();
  });

  it("saves a catalog toggle to enabled_tracks rather than the deny-list", async () => {
    const user = userEvent.setup();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: CATALOG_RECOMMENDED }),
    ]);
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({ enabled_tracks: [CATALOG_RECOMMENDED] }),
    );
    const saveSpy = vi
      .spyOn(SettingsService, "saveSettings")
      .mockResolvedValue(true);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${CATALOG_RECOMMENDED}`);

    await user.click(
      within(card).getByTestId(`track-toggle-${CATALOG_RECOMMENDED}`),
    );

    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled_tracks: [],
          disabled_tracks: [],
        }),
      ),
    );
  });

  it("drops a re-enabled catalog track from an unmigrated deny-list", async () => {
    // A stale deny entry would otherwise veto the allow-list entry we just
    // wrote, leaving the toggle on and the track still absent.
    const user = userEvent.setup();
    vi.spyOn(TracksService, "getTracks").mockResolvedValue([
      buildTrack({ name: CATALOG_RECOMMENDED }),
    ]);
    vi.spyOn(SettingsService, "getSettings").mockResolvedValue(
      buildSettings({
        enabled_tracks: undefined,
        disabled_tracks: [CATALOG_RECOMMENDED],
      }),
    );
    const saveSpy = vi
      .spyOn(SettingsService, "saveSettings")
      .mockResolvedValue(true);

    renderTracksSettingsScreen();
    const card = await screen.findByTestId(`track-card-${CATALOG_RECOMMENDED}`);

    await user.click(
      within(card).getByTestId(`track-toggle-${CATALOG_RECOMMENDED}`),
    );

    await waitFor(() =>
      expect(saveSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled_tracks: expect.arrayContaining([CATALOG_RECOMMENDED]),
          disabled_tracks: [],
        }),
      ),
    );
  });
});
