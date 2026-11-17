import { TextContent } from "#/types/agent-server/core/base/common";

/**
 * Represents a single activated track with its name and associated content.
 */
export interface TrackReadyItem {
  name: string;
  content: string;
}

/**
 * Extracts all text content from an array of TextContent items.
 */
function extractAllText(extendedContent: TextContent[]): string {
  return extendedContent
    .filter((c) => c.type === "text")
    .map((c) => c.text)
    .join("");
}

/**
 * Extracts all <EXTRA_INFO> blocks from the given text.
 * Returns an array of content strings (without the wrapper tags).
 */
const extractExtraInfoBlocks = (text: string): string[] => {
  const blockRegex = /<EXTRA_INFO>([\s\S]*?)<\/EXTRA_INFO>/gi;
  return Array.from(text.matchAll(blockRegex), (match) =>
    match[1].trim(),
  ).filter(Boolean);
};

/**
 * Formats a single track with its corresponding content block.
 */
const formatTrackWithContent = (
  track: string,
  contentBlock: string | undefined,
): string => {
  let formatted = `\n\n- **${track}**`;

  if (contentBlock) {
    formatted += `\n\n${contentBlock}`;
  }

  return formatted;
};

/**
 * Formats tracks paired with their corresponding extended content blocks.
 */
const formatTrackKnowledge = (
  activatedTracks: string[],
  extraInfoBlocks: string[],
): string => {
  let content = `\n\n**Triggered Track Knowledge:**`;

  activatedTracks.forEach((track, index) => {
    const contentBlock = extraInfoBlocks[index];
    content += formatTrackWithContent(track, contentBlock);
  });

  return content;
};

/**
 * Formats extended content blocks when no tracks are present.
 */
const formatExtendedContentOnly = (extraInfoBlocks: string[]): string => {
  let content = `\n\n**Extended Content:**`;

  extraInfoBlocks.forEach((block) => {
    content += `\n\n${block}`;
  });

  return content;
};

/**
 * Extracts EXTRA_INFO blocks from extended content.
 */
const getExtraInfoBlocks = (extendedContent?: TextContent[]): string[] => {
  if (!extendedContent) return [];
  return extractExtraInfoBlocks(extractAllText(extendedContent));
};

/**
 * Formats activated tracks and extended content into markdown for display.
 * Each track is paired with its corresponding <EXTRA_INFO> block by index.
 */
export const getTrackReadyContent = (
  activatedTracks: string[],
  extendedContent: TextContent[],
): string => {
  const extraInfoBlocks = getExtraInfoBlocks(extendedContent);

  if (activatedTracks && activatedTracks.length > 0) {
    return formatTrackKnowledge(activatedTracks, extraInfoBlocks);
  }

  if (extraInfoBlocks.length > 0) {
    return formatExtendedContentOnly(extraInfoBlocks);
  }

  return "";
};

/**
 * Returns structured track items with their names and associated content.
 * Each track is paired with its corresponding <EXTRA_INFO> block by index.
 */
export const getTrackReadyItems = (
  activatedTracks: string[],
  extendedContent: TextContent[],
): TrackReadyItem[] => {
  const extraInfoBlocks = getExtraInfoBlocks(extendedContent);

  if (activatedTracks && activatedTracks.length > 0) {
    return activatedTracks.map((track, index) => ({
      name: track,
      content: extraInfoBlocks[index] ?? "",
    }));
  }

  return extraInfoBlocks.map((block, index) => ({
    name: `Extended Content ${index + 1}`,
    content: block,
  }));
};
