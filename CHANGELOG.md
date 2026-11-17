# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0-alpha.2] - 2025-05-11

### Added

- Initial npm package release of `@handprint-ai/agent-vinbox`
- CLI entry point (`npx @handprint-ai/agent-vinbox`) to run full stack locally
- Library build mode with component barrel exports
- Subpath exports for modular imports:
  - `@handprint-ai/agent-vinbox/browser`
  - `@handprint-ai/agent-vinbox/conversation`
  - `@handprint-ai/agent-vinbox/files`
  - `@handprint-ai/agent-vinbox/settings`
  - `@handprint-ai/agent-vinbox/sidebar`
  - `@handprint-ai/agent-vinbox/terminal`
  - `@handprint-ai/agent-vinbox/i18n`
- TypeScript type declarations
- GitHub Actions workflow for automated npm publishing (OIDC trusted publishing)

[Unreleased]: https://github.com/HandPrint-AI/agent-vinbox/compare/v1.0.0-alpha.2...HEAD
[1.0.0-alpha.2]: https://github.com/HandPrint-AI/agent-vinbox/releases/tag/v1.0.0-alpha.2
