import type { VinboxExtensionModule } from "#/types/vinbox-extension";

export class InvalidVinboxExtensionModuleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidVinboxExtensionModuleError";
  }
}

export function assertVinboxExtensionModule(
  value: unknown,
): asserts value is VinboxExtensionModule {
  if (
    typeof value !== "object" ||
    value === null ||
    !("activate" in value) ||
    typeof value.activate !== "function"
  ) {
    throw new InvalidVinboxExtensionModuleError(
      'Vinbox Extension entrypoint must export an "activate" function.',
    );
  }
}

/**
 * Import an authenticated, self-contained ESM bundle without putting the
 * Agent Server session key in a URL. The source has already been fetched by
 * Vinbox through its authenticated HTTP client.
 */
export async function loadVinboxExtensionModule(
  source: string,
): Promise<VinboxExtensionModule> {
  const blob = new Blob([source], { type: "text/javascript" });
  const moduleUrl = URL.createObjectURL(blob);
  try {
    const imported: unknown = await import(/* @vite-ignore */ moduleUrl);
    assertVinboxExtensionModule(imported);
    return imported;
  } finally {
    URL.revokeObjectURL(moduleUrl);
  }
}
