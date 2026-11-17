/**
 * Mock-LLM E2E tests: track loading from project and user directories.
 *
 * These tests verify that the SDK's track loading machinery works
 * end-to-end with the real agent-server stack:
 *
 * 1. **Project tracks** from `{workspace}/.agents/tracks/` are loaded
 *    alongside bundled public tracks and trigger on matching keywords.
 *    The test creates a standalone git repo with the track committed,
 *    then creates a conversation via API pointing at that repo. The
 *    agent-server creates a worktree from the repo, and since the track
 *    is committed, `load_project_tracks` finds it in the worktree.
 *
 * 2. **User tracks** from `~/.handprint/tracks/` are loaded and trigger
 *    on matching keywords.
 *
 * 3. **Track deletion**: removing a track file means it is NOT loaded
 *    in subsequent conversations.
 *
 * All tests create ephemeral TRACK.md files with unique trigger keywords,
 * send a message containing those keywords, and verify `activated_tracks`
 * appears in the conversation events API.
 */

import {
  test,
  expect,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import {
  BACKEND_URL,
  SESSION_API_KEY,
  seedLocalStorage,
  routeSessionApiKey,
  dismissAnalyticsModal,
  waitForNonUserMessageText,
  deleteConversation,
  registerTrajectory,
  activateTrajectory,
  resetMockLLM,
  ensureMockLLMProfile,
  setChatInput,
  waitForPath,
  getConversationIdFromURL,
} from "../utils/mock-llm-helpers";
import {
  createProjectTrackRepo,
  removeProjectTrackRepo,
  writeUserTrack,
  removeUserTrack,
  userTrackExists,
  userTrackDirExists,
} from "../utils/track-test-helpers";

/**
 * Register a workspace on the agent-server so it appears in the UI dropdown.
 */
async function addWorkspaceToServer(
  request: APIRequestContext,
  name: string,
  path: string,
): Promise<void> {
  const resp = await request.post(`${BACKEND_URL}/api/workspaces`, {
    headers: {
      "X-Session-API-Key": SESSION_API_KEY,
      "Content-Type": "application/json",
    },
    data: {
      workspaces: [{ id: `e2e-${name}`, name, path }],
    },
  });
  expect(
    resp.ok(),
    `POST /api/workspaces failed: ${resp.status()} ${await resp.text()}`,
  ).toBe(true);
}

/**
 * Remove a workspace from the agent-server.
 */
async function removeWorkspaceFromServer(
  request: APIRequestContext,
  path: string,
): Promise<void> {
  await request.delete(`${BACKEND_URL}/api/workspaces`, {
    headers: { "X-Session-API-Key": SESSION_API_KEY },
    params: { path },
  });
}

async function navigateToNewChat(page: Page): Promise<void> {
  await expect(async () => {
    await page
      .getByTestId("sidebar-conversations-link")
      .click({ timeout: 5_000 });
    await expect(page).toHaveURL(/\/conversations\/?$/, { timeout: 5_000 });
  }).toPass({ timeout: 30_000, intervals: [500, 1_000, 2_000] });
}

// ── Shared constants ─────────────────────────────────────────────────

const REPLY_TOKEN = "TRACKS_E2E_REPLY_OK";

// ── Tests ─────────────────────────────────────────────────────────────

test.describe.configure({ mode: "serial" });

test.describe("track loading: project, user, and deletion", () => {
  const conversationIds = new Set<string>();

  // Unique track names to avoid collisions with real tracks
  const PROJECT_TRACK_NAME = "e2e-test-project-track";
  const PROJECT_TRACK_TRIGGER = "xyzzy-project-e2e-test";

  const USER_TRACK_NAME = "e2e-test-user-track";
  const USER_TRACK_TRIGGER = "xyzzy-user-e2e-test";

  test.beforeEach(async ({ page }) => {
    await seedLocalStorage(page);
  });

  test.afterEach(async ({ page, request }) => {
    const match = page.url().match(/\/conversations\/([^/?#]+)/);
    if (match?.[1]) conversationIds.add(decodeURIComponent(match[1]));

    for (const id of Array.from(conversationIds)) {
      try {
        await deleteConversation(request, id);
        conversationIds.delete(id);
      } catch {
        // best-effort cleanup
      }
    }
    await resetMockLLM(request).catch(() => {});
  });

  // Track the agent-side workspace path for cleanup (may differ from
  // the host path in Docker mode where volumes are mounted)
  let projectTrackAgentDir = "";

  test.afterAll(async ({ request }) => {
    removeProjectTrackRepo(PROJECT_TRACK_NAME);
    removeUserTrack(USER_TRACK_NAME);
    if (projectTrackAgentDir) {
      await removeWorkspaceFromServer(request, projectTrackAgentDir).catch(
        () => {},
      );
    }
  });

  // ── Test 1: Project track loaded from workspace ──────────────────
  //
  // Creates a standalone git repo with the track committed, registers it
  // as a workspace on the agent-server, then uses the UI to select that
  // workspace and send a message. The agent-server creates a worktree
  // from the repo, and the committed track file is present in it for
  // `load_project_tracks` to discover.

  test("project track in workspace/.agents/tracks/ triggers on matching keyword", async ({
    page,
    request,
  }) => {
    await ensureMockLLMProfile(page);

    // Create a git repo with the track committed
    const { agentDir } =
      await test.step("create git repo with project track", () => {
        return createProjectTrackRepo(
          PROJECT_TRACK_NAME,
          PROJECT_TRACK_TRIGGER,
        );
      });
    projectTrackAgentDir = agentDir;

    // Register the workspace on the server using the agent-side path
    // (same as hostDir in npm mode, container mount path in Docker mode)
    await test.step("register workspace on server", async () => {
      await addWorkspaceToServer(request, "track-test-repo", agentDir);
    });

    // Trajectory: padding for track-analysis + agent reply
    await registerTrajectory(request, "project-track", [
      { text: "" },
      { text: `Track test complete. ${REPLY_TOKEN}` },
    ]);
    await activateTrajectory(request, "project-track");

    await routeSessionApiKey(page);
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await dismissAnalyticsModal(page);

    // Select the workspace through the UI
    await test.step("select workspace from UI", async () => {
      // Click "Open workspace" to open the dialog
      await page.getByTestId("open-workspace-button").click();

      // Click the workspace dropdown and select our workspace
      const dropdown = page.getByTestId("workspace-dropdown");
      await dropdown.click();
      // The workspace name is "track-test-repo" — click the matching option
      await page.getByText("track-test-repo").click();

      // Click the Confirm button to set the workspace
      await page.getByTestId("workspace-launch-button").click();
    });

    await test.step("send message with project track trigger", async () => {
      await setChatInput(
        page,
        `Please help me with ${PROJECT_TRACK_TRIGGER} setup`,
      );
      await page.getByTestId("submit-button").click();
      await waitForPath(page, /\/conversations\/.+/, 30_000);
    });

    const conversationId = getConversationIdFromURL(page);
    conversationIds.add(conversationId);

    await test.step("verify agent reply", async () => {
      await waitForNonUserMessageText(page, REPLY_TOKEN, 45_000);
    });

    await test.step("verify project track activated", async () => {
      await expect
        .poll(
          async () => {
            const resp = await request.get(
              `${BACKEND_URL}/api/conversations/${encodeURIComponent(conversationId)}/events/search`,
              {
                headers: { "X-Session-API-Key": SESSION_API_KEY },
                params: { limit: "50" },
              },
            );
            if (!resp.ok()) return `HTTP ${resp.status()}`;
            const body = (await resp.json()) as { items?: unknown[] };
            for (const item of body.items ?? []) {
              const e = item as Record<string, unknown>;
              const tracks = e.activated_tracks as string[] | undefined;
              if (tracks?.includes(PROJECT_TRACK_NAME)) return "FOUND";
            }
            return "NOT_FOUND";
          },
          {
            message: `expected "${PROJECT_TRACK_NAME}" in activated_tracks`,
            intervals: [1_000, 2_000, 3_000, 5_000],
            timeout: 25_000,
          },
        )
        .toBe("FOUND");
    });
  });

  // ── Test 2: User track loaded from ~/.handprint/tracks/ ──────────

  test("user track in ~/.handprint/tracks/ triggers on matching keyword", async ({
    page,
    request,
  }) => {
    await ensureMockLLMProfile(page);

    await test.step("create user track file", () => {
      writeUserTrack(USER_TRACK_NAME, USER_TRACK_TRIGGER);
      expect(userTrackExists(USER_TRACK_NAME)).toBe(true);
    });

    await registerTrajectory(request, "user-track", [
      { text: "" },
      { text: `Track test complete. ${REPLY_TOKEN}` },
    ]);
    await activateTrajectory(request, "user-track");

    await routeSessionApiKey(page);
    await navigateToNewChat(page);

    await test.step("send message with user track trigger", async () => {
      await setChatInput(
        page,
        `I need help with ${USER_TRACK_TRIGGER} configuration`,
      );
      await page.getByTestId("submit-button").click();
      await waitForPath(page, /\/conversations\/.+/, 30_000);
    });

    const conversationId = getConversationIdFromURL(page);
    conversationIds.add(conversationId);

    await test.step("verify agent reply", async () => {
      await waitForNonUserMessageText(page, REPLY_TOKEN, 45_000);
    });

    await test.step("verify user track activated", async () => {
      await expect
        .poll(
          async () => {
            const resp = await request.get(
              `${BACKEND_URL}/api/conversations/${encodeURIComponent(conversationId)}/events/search`,
              {
                headers: { "X-Session-API-Key": SESSION_API_KEY },
                params: { limit: "50" },
              },
            );
            if (!resp.ok()) return `HTTP ${resp.status()}`;
            const body = (await resp.json()) as { items?: unknown[] };
            for (const item of body.items ?? []) {
              const e = item as Record<string, unknown>;
              const tracks = e.activated_tracks as string[] | undefined;
              if (tracks?.includes(USER_TRACK_NAME)) return "FOUND";
            }
            return "NOT_FOUND";
          },
          {
            message: `expected "${USER_TRACK_NAME}" in activated_tracks`,
            intervals: [1_000, 2_000, 3_000, 5_000],
            timeout: 25_000,
          },
        )
        .toBe("FOUND");
    });
  });

  // ── Test 3: Deleted user track not loaded in new conversation ────

  test("deleting a user track removes it from subsequent conversations", async ({
    page,
    request,
  }) => {
    await ensureMockLLMProfile(page);

    await test.step("delete user track file", () => {
      removeUserTrack(USER_TRACK_NAME);
      expect(userTrackDirExists(USER_TRACK_NAME)).toBe(false);
    });

    // Padding for track-analysis (public tracks are still loaded from the npm
    // package, so the agent-server still makes a track-analysis LLM call)
    await registerTrajectory(request, "deleted-track", [
      { text: "" },
      { text: `No track triggered. ${REPLY_TOKEN}` },
    ]);
    await activateTrajectory(request, "deleted-track");

    await routeSessionApiKey(page);
    await navigateToNewChat(page);

    await test.step("send message with deleted track trigger keyword", async () => {
      await setChatInput(page, `Help me with ${USER_TRACK_TRIGGER} please`);
      await page.getByTestId("submit-button").click();
      await waitForPath(page, /\/conversations\/.+/, 30_000);
    });

    const conversationId = getConversationIdFromURL(page);
    conversationIds.add(conversationId);

    await test.step("verify agent reply", async () => {
      await waitForNonUserMessageText(page, REPLY_TOKEN, 45_000);
    });

    await test.step("verify deleted track NOT activated", async () => {
      // The agent reply already appeared in the UI (verified above), so the
      // conversation completed. Poll the events API and verify no event
      // contains the deleted track in its activated_tracks list.
      await expect
        .poll(
          async () => {
            const resp = await request.get(
              `${BACKEND_URL}/api/conversations/${encodeURIComponent(conversationId)}/events/search`,
              {
                headers: { "X-Session-API-Key": SESSION_API_KEY },
                params: { limit: "100" },
              },
            );
            if (!resp.ok()) return `HTTP ${resp.status()}`;
            const body = (await resp.json()) as { items?: unknown[] };
            const items = body.items ?? [];
            if (items.length === 0) return "NO_EVENTS";

            for (const item of items) {
              const e = item as Record<string, unknown>;
              const tracks = e.activated_tracks as string[] | undefined;
              if (tracks?.includes(USER_TRACK_NAME))
                return `UNEXPECTEDLY_FOUND`;
            }
            return "VERIFIED";
          },
          {
            message: `verifying "${USER_TRACK_NAME}" NOT in activated_tracks`,
            intervals: [1_000, 2_000, 3_000],
            timeout: 15_000,
          },
        )
        .toBe("VERIFIED");
    });
  });
});
