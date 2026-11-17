/**
 * Helpers for track loading E2E tests.
 *
 * File-system operations (create/remove TRACK.md files) and API
 * assertions (verify activated_tracks on events) are separated here
 * to avoid type-resolution conflicts between node built-in imports
 * and @playwright/test types in the same file (TypeScript 6 / Node 24).
 *
 * Docker support: When running against a Docker container, the agent-server
 * filesystem is isolated from the host. The Playwright config sets env vars
 * for the container-side paths so the test can register the correct paths
 * with the agent-server while creating files on the host (volume-mounted).
 */

import { resolve, join } from "path";
import { mkdirSync, writeFileSync, rmSync, existsSync } from "fs";
import { execSync } from "child_process";
import { homedir } from "os";

// ── Paths ────────────────────────────────────────────────────────────

/** STATE_DIR matches playwright.mock-llm.config.ts */
export const STATE_DIR = resolve(".tmp/mock-llm-state");

/**
 * Root directory for track-test workspace git repos (HOST-side).
 * Each call to `createProjectTrackRepo` creates a self-contained git repo
 * here with the track file already committed, so the agent-server's
 * worktree machinery picks it up (worktrees only contain committed content).
 */
export const TRACK_REPOS_DIR = resolve(".tmp/mock-llm-track-repos");

/**
 * The path the agent-server sees for track repos.
 * In npm mode this is the same as TRACK_REPOS_DIR (same filesystem).
 * In Docker mode this is the container-side mount point set by the config.
 */
export const TRACK_REPOS_AGENT_DIR =
  process.env.MOCK_LLM_TRACK_REPOS_CONTAINER_DIR ?? TRACK_REPOS_DIR;

/**
 * User-level tracks directory — HOST-side (for file creation/removal).
 * In Docker mode, we use a local temp dir that is volume-mounted into the
 * container at the agent-server's expected `~/.handprint/tracks/` path.
 */
export const USER_TRACKS_DIR = process.env.MOCK_LLM_USER_TRACKS_HOST_DIR
  ? resolve(process.env.MOCK_LLM_USER_TRACKS_HOST_DIR)
  : join(homedir(), ".handprint", "tracks");

// ── Track content builders ───────────────────────────────────────────

function makeTrackMd(
  name: string,
  trigger: string,
  description: string,
): string {
  return [
    "---",
    `name: ${name}`,
    `description: ${description}`,
    "triggers:",
    `- ${trigger}`,
    "---",
    "",
    `This is the ${name} track content for E2E testing.`,
    `It should activate when the keyword "${trigger}" appears.`,
  ].join("\n");
}

/**
 * Create a standalone git repo with a project track committed.
 *
 * The agent-server creates a git worktree for each conversation from the
 * source workspace. Only committed files appear in worktrees, so the track
 * must be committed to the repo for `load_project_tracks` to find it.
 *
 * @returns Object with `hostDir` (absolute host path for file ops) and
 *          `agentDir` (path the agent-server sees — same in npm mode,
 *          container-side mount in Docker mode).
 */
export function createProjectTrackRepo(
  name: string,
  trigger: string,
  description = "E2E test track",
): { hostDir: string; agentDir: string } {
  const repoDir = join(TRACK_REPOS_DIR, `${name}-repo`);
  // Start fresh each time
  rmSync(repoDir, { recursive: true, force: true });
  mkdirSync(repoDir, { recursive: true });

  // Write the track file
  const trackDir = join(repoDir, ".agents", "tracks", name);
  mkdirSync(trackDir, { recursive: true });
  writeFileSync(
    join(trackDir, "TRACK.md"),
    makeTrackMd(name, trigger, description),
  );

  // Initialize as a git repo and commit
  const opts = { cwd: repoDir, stdio: "pipe" as const };
  execSync("git init", opts);
  execSync('git config user.email "test@test.com"', opts);
  execSync('git config user.name "Test"', opts);
  execSync("git add -A", opts);
  execSync('git commit -m "Add project track"', opts);

  const hostDir = resolve(repoDir);
  const agentDir = join(TRACK_REPOS_AGENT_DIR, `${name}-repo`);
  return { hostDir, agentDir };
}

/** Remove a project track repo created by `createProjectTrackRepo`. */
export function removeProjectTrackRepo(name: string): void {
  const repoDir = join(TRACK_REPOS_DIR, `${name}-repo`);
  rmSync(repoDir, { recursive: true, force: true });
}

export function writeUserTrack(
  name: string,
  trigger: string,
  description = "E2E test user track",
): void {
  const dir = join(USER_TRACKS_DIR, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "TRACK.md"), makeTrackMd(name, trigger, description));
}

export function removeUserTrack(name: string): void {
  const dir = join(USER_TRACKS_DIR, name);
  rmSync(dir, { recursive: true, force: true });
}

export function userTrackExists(name: string): boolean {
  return existsSync(join(USER_TRACKS_DIR, name, "TRACK.md"));
}

export function userTrackDirExists(name: string): boolean {
  return existsSync(join(USER_TRACKS_DIR, name));
}
