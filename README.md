# HandPrint-Vinbox

**HandPrint runs EXCLUSIVELY inside the Vinbox machine.**

No external API keys, no standalone operation, no cloud backends. HandPrint leverages Vinbox's model registry (OpenCode free models, local .gguf files, subscription providers enabled by user), CDP 9222 browser terminal, and pwsh terminal with working dir `app/program-file`.

## ⚠️ VINBOX-ONLY SCOPE

This repository is a vinbox-integrated version of HandPrint. It does NOT operate standalone and does NOT support:

- Running outside of a Vinbox container
- External model providers (OpenAI, Anthropic, etc.) - all model access goes through Vinbox's bridge (port 4097)
- Independent browser/terminal instances - uses Vinbox's CDP 9222 and pwsh
- Hardcoded LLM configuration - all models/resolve from Vinbox's MODELS tab

## 🏓 How HandPrint Works Inside VinBox

- **Model Lane**: Uses Vinbox's OpenAI-compatible bridge at `http://127.0.0.1:4097/v1`, which always answers with the model selected in the Vinbox MODELS tab (free OpenCode models, local .gguf files, or subscription providers the user enabled)
- **Browser**: Attaches to Vinbox's single Chromium on CDP 9222
- **Terminal**: Uses Vinbox's pwsh shell, working directory `app/program-file`
- **State**: Persisted in `vinbox/data/` (bind-mounted, survives a rebuild)

## 📁 Key Files Updated for VinBox Integration

| File | Purpose |
|------|---------|
| `handprint/src/services/vinbox-lane.ts` | Resolver for LLM/CDP/shell/workingDir/modelsJson - all values from Vinbox environment |
| `handprint/src/services/settings.ts` | `llm_model` and `llm_base_url` resolved from `vinbox-lane` resolver (`VINBOX_LANE_DEFAULTS`) |
| `handprint/config/defaults.json` | Vinbox defaults: llmBridgePort 4097, cdpPort 9222, shell pwsh, workingDir `/app/vinbox/app/program-file` |
| `app/llm/openai_bridge.py` | OpenAI-compatible bridge that uses `model_registry.current_selection()` - never chooses a model itself |
| `docker-compose.yml` | HandPrint service running inside Vinbox container with env `VINBOX_HOME`, `VINBOX_LLM_BASE_URL`, `VINBOX_CDP_URL`, `VINBOX_PROGRAM_FILE`, `VINBOX_SHELL` |
| `entrypoint.sh` | Starts HandPrint agent-server inside Vinbox on port 18000 with proper env vars |

## 🐳 Docker Integration

The HandPrint service is added to `docker-compose.yml` and `entrypoint.sh` as a service running INSIDE the Vinbox machine:

```yaml
handprint:
  build:
    context: .
    dockerfile: handprint/docker/Dockerfile
  image: handprint-vinbox:latest
  container_name: handprint-core
  restart: unless-stopped
  environment:
    VINBOX_HOME: /app/vinbox
    VINBOX_LLM_BASE_URL: http://127.0.0.1:4097/v1
    VINBOX_CDP_URL: http://127.0.0.1:9222
    VINBOX_PROGRAM_FILE: /app/vinbox/app/program-file
    VINBOX_SHELL: pwsh
  ports:
    - "18000:18000"  # HandPrint agent-server
```

## 🔒 Security

- No API keys or tokens are hardcoded in the code
- All model access goes through Vinbox's model registry
- No OpenHands code is used - this is a standalone HandPrint deployment
- VINBOX ID and tokens are environment-configured, not embedded in code

## 📦 Repo Information

- **Original repo**: GitHub was `HandPrint-AI/Handprint`
- **New vinbox-specific repo**: `github.com/takebox/handprint-vinbox`
- **Purpose**: HandPrint service that runs exclusively within Vinbox environment
- **Model LLM**: Handled through Vinbox's model registry (OpenCode free models, local .gguf, subscription providers enabled by user)
- **No external provider stacks**

## 🚀 Quick Start (Inside VinBox)

HandPrint is already included when you run `docker compose up -d --build` in the Vinbox directory. The HandPrint agent-server will start on port 18000 inside the Vinbox container, using:

- Model lane: `http://127.0.0.1:4097/v1`
- CDP terminal: `http://127.0.0.1:9222`
- pwsh shell: working dir `app/program-file`

No additional setup required - HandPrint leverages all of Vinbox's existing infrastructure.