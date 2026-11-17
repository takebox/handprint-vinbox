/// <reference types="vite/client" />

/**
 * Absolute filesystem path to the bundled extensions tracks directory,
 * injected by Vite at build time via `define` in vite.config.ts.
 * Empty string in library builds; always a real path in app/dev builds.
 */
declare const __EXTENSIONS_TRACKS_DIR__: string;
