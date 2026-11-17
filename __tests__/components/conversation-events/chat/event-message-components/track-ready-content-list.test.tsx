import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import { renderWithProviders } from "test-utils";
import { I18nKey } from "#/i18n/declaration";
import { TrackReadyContentList } from "#/components/conversation-events/chat/event-message-components/track-ready-content-list";
import { TrackReadyItem } from "#/components/conversation-events/chat/event-content-helpers/create-track-ready-event";

const makeItems = (
  ...entries: [string, string][]
): TrackReadyItem[] =>
  entries.map(([name, content]) => ({ name, content }));

describe("TrackReadyContentList", () => {
  it("renders all track names", () => {
    const items = makeItems(["docker", "content1"], ["gitlab", "content2"]);

    renderWithProviders(<TrackReadyContentList items={items} />);

    expect(screen.getByText("docker")).toBeInTheDocument();
    expect(screen.getByText("gitlab")).toBeInTheDocument();
  });

  it("renders the header label", () => {
    const items = makeItems(["docker", "content"]);

    renderWithProviders(<TrackReadyContentList items={items} />);

    expect(
      screen.getByText("TRACKS$TRIGGERED_TRACK_KNOWLEDGE"),
    ).toBeInTheDocument();
  });

  it("renders a custom header label when titleKey is provided", () => {
    const items = makeItems(["docker", "content"]);

    renderWithProviders(
      <TrackReadyContentList
        items={items}
        titleKey={I18nKey.TRACKS$INVOKED_TRACK_KNOWLEDGE}
      />,
    );

    expect(
      screen.getByText("TRACKS$INVOKED_TRACK_KNOWLEDGE"),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("TRACKS$TRIGGERED_TRACK_KNOWLEDGE"),
    ).not.toBeInTheDocument();
  });

  it("does not show content before clicking", () => {
    const items = makeItems(["docker", "Docker usage guide"]);

    renderWithProviders(<TrackReadyContentList items={items} />);

    expect(screen.queryByText("Docker usage guide")).not.toBeInTheDocument();
  });

  it("expands track content on click", async () => {
    const user = userEvent.setup();
    const items = makeItems(["docker", "Docker usage guide"]);

    renderWithProviders(<TrackReadyContentList items={items} />);

    await user.click(screen.getByText("docker"));

    expect(screen.getByText("Docker usage guide")).toBeInTheDocument();
  });

  it("collapses track content on second click", async () => {
    const user = userEvent.setup();
    const items = makeItems(["docker", "Docker usage guide"]);

    renderWithProviders(<TrackReadyContentList items={items} />);

    await user.click(screen.getByText("docker"));
    expect(screen.getByText("Docker usage guide")).toBeInTheDocument();

    await user.click(screen.getByText("docker"));
    expect(screen.queryByText("Docker usage guide")).not.toBeInTheDocument();
  });

  it("expands tracks independently", async () => {
    const user = userEvent.setup();
    const items = makeItems(
      ["docker", "Docker guide"],
      ["gitlab", "GitLab guide"],
    );

    renderWithProviders(<TrackReadyContentList items={items} />);

    await user.click(screen.getByText("docker"));

    expect(screen.getByText("Docker guide")).toBeInTheDocument();
    expect(screen.queryByText("GitLab guide")).not.toBeInTheDocument();
  });

  it("renders <important> content as bold text", async () => {
    const user = userEvent.setup();
    const content = "Some text <important>critical info</important> more text";
    const items = makeItems(["docker", content]);

    renderWithProviders(<TrackReadyContentList items={items} />);

    await user.click(screen.getByText("docker"));

    // The important text should be rendered as bold (strong element)
    const boldElement = screen.getByText("critical info");
    expect(boldElement).toBeInTheDocument();
    expect(boldElement.tagName).toBe("STRONG");
  });

  it("parses and displays file path from metadata", async () => {
    const user = userEvent.setup();
    const content = [
      "The following information has been included based on a keyword match for \"docker\".",
      "It may or may not be relevant to the user's request.",
      "Track location: /home/handprint/.handprint/tracks/docker/TRACK.md",
      "(Use this path to resolve relative file references)",
      "",
      "Docker Usage Guide",
    ].join("\n");
    const items = makeItems(["docker", content]);

    renderWithProviders(<TrackReadyContentList items={items} />);

    await user.click(screen.getByText("docker"));

    // File path rendered in code element
    expect(
      screen.getByText(
        "/home/handprint/.handprint/tracks/docker/TRACK.md",
      ),
    ).toBeInTheDocument();
    // Actual track body rendered
    expect(screen.getByText("Docker Usage Guide")).toBeInTheDocument();
    // Metadata preamble lines are not rendered as-is in the body
    expect(
      screen.queryByText("It may or may not be relevant"),
    ).not.toBeInTheDocument();
  });
});
