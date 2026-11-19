# Integrating DefenseClaw with Agent Vinbox

[DefenseClaw](https://github.com/cisco-ai-defense/defenseclaw) is a security governance layer for agentic AI runtimes — it scans tracks and MCP servers before they run, inspects LLM traffic at runtime, and produces durable audit evidence. This guide explains how to run DefenseClaw alongside the [Handprint Agent Server](https://github.com/takebox/software-agent-sdk-vinbox/tree/main/handprint-vinbox-agent-server) that powers Agent Vinbox, without making any code-level changes to either project.

> **Status:** DefenseClaw is purpose-built around the OpenClaw runtime and its TypeScript plugin hooks. The integration described here targets the lowest-friction overlap points — track injection, LLM proxying, CLI scanning, and audit export — that work without modifying Agent Vinbox or DefenseClaw source code. [Future work](#future-work-code-level-extensions) describes deeper hooks that would require code changes.

---

## How the Two Systems Fit Together

```mermaid
flowchart TD
    UI["Agent Vinbox (browser)"]
    AS["Handprint Agent Server\nlocalhost:18000"]
    GP["DefenseClaw Guardrail Proxy\nlocalhost:4000"]
    LLM["LLM Provider"]
    GW["DefenseClaw Gateway Sidecar\nlocalhost:19970"]
    CLI["DefenseClaw CLI / TUI"]

    UI -->|HTTP| AS
    AS -->|LLM API calls| GP
    GP -->|forwarded request| LLM
    GW <-->|REST API| AS
    CLI <-->|REST API| GW

    style GW fill:#fff3cd,stroke:#856404
    style CLI fill:#fff3cd,stroke:#856404
    style GP fill:#f8d7da,stroke:#842029
```

**Shared concepts:**

| Agent Vinbox / Agent Server | DefenseClaw equivalent |
|---|---|
| Tracks (`.agents/tracks/`) | Tracks (scanned by `cisco-ai-track-scanner` + CodeGuard) |
| MCP servers | MCP servers (scanned by `cisco-ai-mcp-scanner`) |
| LLM settings (`base_url`) | Guardrail proxy upstream target |
| Workspace files (generated code) | CodeGuard scan surface |
| Agent Server hooks | Potential enforcement point (future work) |

---

## Prerequisites

| Component | Version |
|---|---|
| Agent Vinbox / Agent Server | Current `main` |
| Python | 3.10+ |
| Go | 1.26.2+ (for DefenseClaw gateway) |
| DefenseClaw | Latest release |

---

## Installation

### 1. Install and initialise DefenseClaw

```bash
# Install from the release script
curl -LsSf https://raw.githubusercontent.com/cisco-ai-defense/defenseclaw/main/scripts/install.sh | bash

# Initialise config and enable the guardrail proxy
defenseclaw init --enable-guardrail
```

Verify the installation:

```bash
defenseclaw doctor
```

Start the Go gateway sidecar (keep this running alongside the Agent Server):

```bash
defenseclaw-gateway start
```

### 2. Start Agent Vinbox

Follow the standard [Agent Vinbox quickstart](../README.md). The integration steps below assume the Agent Server is reachable at `http://localhost:18000`.

---

## Integration Points

### A. Load the CodeGuard Track

DefenseClaw ships a ready-made Handprint track — `tracks/codeguard/TRACK.md` — that teaches the agent the CodeGuard security rules. When the track is active, the agent writes code that avoids the patterns DefenseClaw blocks at scan time (hardcoded secrets, `os.system()`, string-interpolated SQL, weak crypto, path traversal, etc.).

**Install the track into a user or project track directory:**

```bash
# User-level (applies to all Agent Server conversations on this machine)
mkdir -p ~/.agents/tracks/codeguard
curl -fsSL https://raw.githubusercontent.com/cisco-ai-defense/defenseclaw/main/tracks/codeguard/TRACK.md \
  -o ~/.agents/tracks/codeguard/TRACK.md

# Project-level (checked in alongside your project, only affects that workspace)
mkdir -p .agents/tracks/codeguard
curl -fsSL https://raw.githubusercontent.com/cisco-ai-defense/defenseclaw/main/tracks/codeguard/TRACK.md \
  -o .agents/tracks/codeguard/TRACK.md
```

The Agent Server loads tracks from these directories automatically at conversation start. No restart of the server is required for user-level tracks; project-level tracks are loaded when the conversation workspace is opened.

**What this achieves:** The agent's system prompt is augmented with the full CodeGuard rule set. Code it generates will pre-emptively avoid the patterns that the downstream `defenseclaw codeguard scan` would flag.

---

### B. Route LLM Traffic Through the Guardrail Proxy

The DefenseClaw guardrail proxy runs on `localhost:4000` and acts as an OpenAI-compatible reverse proxy. Pointing the Agent Server's LLM calls through it causes every prompt and completion to be inspected — in observe mode (log only) or action mode (block on policy violations).

**Configure the LLM base URL in Agent Vinbox:**

Open the Agent Vinbox settings panel → select your active backend → under **LLM settings**, set **Base URL** to:

```
http://localhost:4000
```

Leave the model name and API key as-is. The proxy reads the original `Authorization` / `x-api-key` header, forwards the request to the real provider, and injects its own `X-DC-Target-URL` routing header — the agent code and Agent Server require no changes.

**Via environment variable (server-side):**

If you configure your Agent Server through environment variables, set the LLM base URL before starting it:

```bash
# Example using OpenAI; set model and key as normal, only base_url changes
export OH_LLM__BASE_URL="http://localhost:4000"
npm run dev
```

> Consult the Agent Server [settings schema](https://github.com/takebox/software-agent-sdk-vinbox/blob/main/handprint-vinbox-agent-server/handprint/agent_server/settings_router.py) for the exact environment variable name used in your deployment.

**Start the guardrail in observe mode (safe default) or action mode:**

```bash
# Observe — log findings, never block (recommended while tuning)
defenseclaw setup guardrail --mode observe --restart

# Action — block prompts and responses that match policies
defenseclaw setup guardrail --mode action --restart
```

**Supported providers:**

The DefenseClaw proxy handles Juglow (`platform.juglow.my.id`), OpenAI (`api.openai.com`), OpenRouter, Azure OpenAI, Gemini, Ollama, and Bedrock. Provider detection is automatic based on the target URL.

---

### C. Scan Tracks Before Loading

Before installing a track from the marketplace or an external source into the Agent Server, use the DefenseClaw CLI to vet it:

```bash
# Scan a locally downloaded track directory
defenseclaw track scan path/to/track-directory

# Scan an installed track by name (requires the track to be registered in the DefenseClaw inventory)
defenseclaw track scan my-track-name

# List all tracks currently visible to DefenseClaw
defenseclaw track list
```

The scanner applies `cisco-ai-track-scanner` rules plus CodeGuard static analysis and emits a verdict (`PASS`, `WARN`, `BLOCK`) with per-finding details. HIGH and CRITICAL findings block track use in action mode.

**Workflow recommendation:** Add `defenseclaw track scan <track-dir>` as a pre-commit or CI step in repositories that ship tracks for Agent Vinbox.

---

### D. Scan Agent-Generated Code

After an agent conversation produces code in the workspace, run CodeGuard on the output before committing:

```bash
# Scan an entire workspace directory
defenseclaw codeguard scan /path/to/workspace

# Scan a single file
defenseclaw codeguard scan /path/to/workspace/src/auth.py

# Output as JSON (useful in CI pipelines)
defenseclaw codeguard scan /path/to/workspace --json
```

CodeGuard checks for hardcoded secrets, dangerous command execution, SQL injection, unsafe deserialization, weak cryptography, SSRF-prone network calls, and path traversal — covering Python, JavaScript, TypeScript, Go, Java, Ruby, and PHP.

**Zero-friction CI gate example (GitHub Actions):**

```yaml
- name: Scan agent-generated code
  run: |
    defenseclaw codeguard scan ${{ github.workspace }} --json \
      | python3 -c "
    import sys, json
    findings = json.load(sys.stdin)
    criticals = [f for f in findings if f.get('severity') in ('HIGH','CRITICAL')]
    if criticals:
        for f in criticals:
            print(f'::error file={f[\"file\"]},line={f[\"line\"]}::{f[\"rule\"]}: {f[\"message\"]}')
        sys.exit(1)
    "
```

---

### E. Monitor via the DefenseClaw TUI and Audit Store

All scan results, guardrail decisions, tool-call inspections, and policy verdicts are written to DefenseClaw's SQLite audit store. The TUI gives a live operator view:

```bash
defenseclaw tui
```

The TUI panels cover:
- **Alerts** — recent HIGH/CRITICAL findings and blocked events
- **Scans** — historical scan results per track/file
- **Tools** — tool-call verdicts from the inspection engine
- **Policy** — current block/allow lists

**Export to external systems:**

| Target | Setup |
|---|---|
| OTLP (Prometheus/Grafana/Honeycomb) | `defenseclaw setup observability --otlp-endpoint http://collector:4317` |
| Splunk HEC | `defenseclaw setup splunk --hec-url http://splunk:8088 --hec-token $TOKEN` |
| Slack / PagerDuty / Webex | `defenseclaw setup notifications --slack-webhook $SLACK_URL` |
| Local Splunk bundle (Docker) | `defenseclaw setup splunk --logs --accept-splunk-license` |

---

## Integration Summary

| Goal | Mechanism | Config change? | Code change? |
|---|---|---|---|
| Agent writes secure code by default | CodeGuard track in `.agents/tracks/` | Drop-in file | No |
| Inspect all LLM prompts and responses | Guardrail proxy at `localhost:4000` | Set `base_url` | No |
| Vet tracks before loading | `defenseclaw track scan` in CI/workflow | None | No |
| Scan agent-generated code | `defenseclaw codeguard scan <workspace>` | None | No |
| Audit trail and alerting | DefenseClaw TUI, OTLP, Splunk, webhooks | DefenseClaw config | No |

---

## Future Work: Code-Level Extensions

The following integrations would require changes to Agent Vinbox, the Agent Server, or DefenseClaw, but would significantly deepen the security posture.

### 1. Native `SecurityAnalyzer` hook

The Handprint SDK exposes a [`SecurityAnalyzer`](https://handprint.juglow.my.id/sdk/arch/security.md) interface. A custom implementation could call DefenseClaw's `/api/v1/inspect/tool` endpoint before every tool invocation — mirroring the inspection the OpenClaw TypeScript plugin performs. This would gate bash commands, file writes, and other tool calls through DefenseClaw's four-stage inspection pipeline (regex, Cisco AI Defense cloud rules, LLM judge, OPA policy) before they execute.

```python
# Sketch — not yet implemented
class DefenseClawSecurityAnalyzer(SecurityAnalyzer):
    async def analyze(self, action: Action) -> ActionSecurityRisk:
        resp = await httpx.post(
            "http://localhost:19970/api/v1/inspect/tool",
            json={"tool": action.tool_name, "args": action.args},
            headers={"X-DefenseClaw-Client": "agent-server"},
        )
        if resp.json()["action"] == "block":
            return ActionSecurityRisk.HIGH
        return ActionSecurityRisk.LOW
```

### 2. Track install pipeline integration

The Agent Server's `tracks_service.py` (`service_install_track`) runs track validation during install. A pre-install hook that calls `defenseclaw track scan` and fails the install on HIGH/CRITICAL findings would enforce a mandatory scan gate — no track reaches the agent without passing DefenseClaw's scanner. This change would live in `handprint-vinbox-agent-server`.

### 3. Hooks integration

The Agent Server loads `.handprint/hooks.json` from the workspace. An `on_conversation_end` hook that runs `defenseclaw codeguard scan <workspace>` and writes findings to a structured report file would give per-session security evidence without manual operator intervention.

### 4. Agent Vinbox security dashboard

A dedicated panel in the Agent Vinbox UI that queries DefenseClaw's gateway REST API (`GET /alerts`, `GET /enforce/blocked`) would surface guardrail findings inline with the conversation view — correlating blocked prompts or tool calls with the agent turn that triggered them.

### 5. Agent Server → DefenseClaw audit bridge

The Agent Server supports outgoing webhooks (`WebhookSpec`). A webhook handler that forwards conversation events to `POST /audit/event` on the DefenseClaw gateway would allow DefenseClaw's audit store to record Agent Server conversation lifecycle events (start, tool invocation, finish) alongside its own security findings — building a single correlated audit trail.

### 6. Track registry alignment

DefenseClaw's registry system (`defenseclaw registry add`) ingests external track/MCP catalogs from ClawHub, Smithery, tracks.sh, HTTP YAML, and Git sources. Aligning the Agent Server's marketplace track catalog with the DefenseClaw registry would allow `defenseclaw track scan all` to exhaustively vet the entire available catalog, not just individually installed tracks.

---

## References

- [DefenseClaw GitHub](https://github.com/cisco-ai-defense/defenseclaw)
- [DefenseClaw Quick Start](https://github.com/cisco-ai-defense/defenseclaw/blob/main/docs/QUICKSTART.md)
- [DefenseClaw API Reference](https://github.com/cisco-ai-defense/defenseclaw/blob/main/docs/API.md)
- [DefenseClaw Guardrail Architecture](https://github.com/cisco-ai-defense/defenseclaw/blob/main/docs/GUARDRAIL.md)
- [DefenseClaw CodeGuard Track](https://github.com/cisco-ai-defense/defenseclaw/blob/main/tracks/codeguard/TRACK.md)
- [Handprint Agent Server](https://github.com/takebox/software-agent-sdk-vinbox/tree/main/handprint-vinbox-agent-server)
- [Handprint SDK Security Analyzer](https://handprint.juglow.my.id/sdk/arch/security.md)
- [Agent Vinbox Self-Hosting](./SELF_HOSTING.md)

---

_This document was created by an AI agent (Handprint) on behalf of the user._
