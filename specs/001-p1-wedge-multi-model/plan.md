# Implementation Plan: Phase 1 Wedge A — multi-model bots + Host 1:1 messaging

**Branch**: `001-p1-wedge-multi-model` | **Date**: 2026-09-25 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-p1-wedge-multi-model/spec.md`

**Note**: Filled by `/speckit-plan`. Design artifacts only — no Electron/app/plugin implementation in this step.

## Summary

Ship Phase 1 wedge A on DeepSeek Harness Desktop: Mohammed creates ≥2 bots with different models/providers (in-app auth), runs a real multi-model chat session without Alt-Tab, and uses async 1:1 bot→bot via Host mailbox only. **Entry gate B** (Shell↔Host framing handshake Verifier pass) is the hard prerequisite before Electron/Runtime feature fan-out. Topology and trust floor are Architect-frozen; Verifier gates Done.

## Technical Context

**Language/Version**: TypeScript on Node `^22.19.0 || >=24` (repo engines); Electron Desktop shell (Windows-first).

**Primary Dependencies**: DeepSeek Harness monorepo — `apps/desktop` (Electron), `apps/desktop-host` (bundled-Node Desktop Host child), Cordis plugin packages under `packages/` (`core` agents/sessions/tools, `llm` + provider adapters, `credentials` / `credentials-local`, `subagent` messaging seams, `client` connection/UI, `host`).

**Storage**: Profile-scoped Host state under `$DSH_HOME/profiles/desktop`; provider secrets via OS secure store / Host credential seam (in-app primary); sessions are not credential stores.

**Testing**: Existing package Vitest suites (`apps/desktop/tests`, `apps/desktop-host/tests`, package tests) + **DH Verifier** acceptance paths for entry gate B and Electron multi-model session (SC-004 / SC-005). Prefer Verifier-shaped acceptance units over new throwaway harnesses.

**Target Platform**: Windows Desktop (Mohammed_Laptop) first; unsigned/local `package:desktop:win:*` acceptable for wedge. mac/linux packaging not required for P1 exit.

**Project Type**: Desktop app (Electron shell + bundled-Node Host) on existing DSH monorepo — extend seams; do not invent a parallel stack.

**Performance Goals**: Time-to-first multi-model team session < 30 minutes on a clean machine, path documented (SC-003). Interactive chat progress + final result within a normal desktop session (no separate SLA invented).

**Constraints (Architect seam freeze — LOCKED)**:

| Seam | Lock |
|------|------|
| Shell↔Host topology | **Only**: bundled-Node Desktop Host child + **framed pipes** for framed traffic + **Node IPC lifecycle-only** + `dsh-app://` app protocol |
| Entry gate B | Framing version + handshake field acceptance MUST pass Verifier **before** Electron/Runtime feature fan-out |
| Messaging | Async 1:1 = **Host mailbox/inbox only** — no parallel Electron messaging bus |
| Host mode | **Chat-only** Host: sessions + LLM adapters + tools registry **without** local shell/box backends |
| Auth | **In-app** primary (Electron main → OS secure store / Host credential seam); env/key files = dev/CI only |
| Trust floor | Isolated agent scopes; tools MUST NOT send/post externally; **no MCP in P1**; sessions are not credential dumps |
| Profile | Same Desktop Host instance + one `$DSH_HOME/profiles/desktop` |

**Scale/Scope**: Single founder user; ≥2 bots; provider set GPT / Claude / Grok / DeepSeek as configured; P1 Out list in spec is binding (box/MCP/groups/voice/send-on-behalf/user-machines/pixel chrome/CreateAgent-from-peer/event routines/1Password/skills/memory/personas richness).

**Ownership (role seams)**:

| Role | Owns |
|------|------|
| **DH Electron** | Shell / framing UI surface; Desktop window; in-app auth UI entry; progress + final result chrome sufficient for wedge |
| **DH Runtime** | Desktop Host child; isolate / `ctx.llm` per-bot model; Host mailbox/inbox; chat-only Host composition; credential seam on Host |
| **DH Spec** | Acceptance criteria; Spec Kit artifacts; scope freeze against plan v0.3 |
| **DH Verifier** | Prove entry gate B; prove Electron multi-model + 1:1 acceptance paths; gates Done |
| **DH Architect** | Topology / seam map (already frozen for P1) |

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Wedge-First Toward North Star (A→C) | PASS | Plan delivers per-bot models + 1:1 + usable Desktop UI on durable DSH seams; no throwaway parallel stack |
| II. Spec-Driven Delivery | PASS | Artifacts follow specify → clarify → plan → tasks → analyze; Linear only after tasks (parent) |
| III. Product Over Implementation Theater | PASS | Scope = Alt-Tab pain + handoff visibility; chrome/personas/skills/memory deferred |
| IV. Verify Against Spec | PASS | Entry gate B + Electron Verifier paths are first-class; Done requires Verifier |
| V. Simplicity & Seam Honesty | PASS | Prefer existing desktop Host child, credentials, llm, subagent/mailbox seams; no duplicate messaging bus |
| Stack & Seam Constraints | PASS | DSH + Electron named; plans name seams without replacing Spec Kit |
| Roles & Decision Rights | PASS | Ownership table above matches constitution roles |

**Post-design re-check**: PASS — data-model/contracts/quickstart describe WHAT interfaces for Verifier; they do not expand into C scope or invent alternate topology.

## Project Structure

### Documentation (this feature)

```text
specs/001-p1-wedge-multi-model/
├── plan.md              # This file
├── research.md          # Phase 0
├── data-model.md        # Phase 1
├── quickstart.md        # Phase 1 validation guide
├── contracts/           # Phase 1 interface contracts
│   ├── entry-gate-b-framing.md
│   ├── host-mailbox-1to1.md
│   ├── per-bot-model-binding.md
│   └── in-app-auth-credential.md
├── tasks.md             # /speckit-tasks (not this command)
├── analysis.md          # /speckit-analyze report artifact
├── spec.md
└── checklists/requirements.md
```

### Source Code (repository root — existing monorepo targets)

```text
apps/
├── desktop/                 # Electron shell (DH Electron)
│   ├── src/                 # host-process, host-protocol, main, preload*, ipc
│   └── tests/
├── desktop-host/            # Bundled-Node Desktop Host child entry (DH Runtime)
│   ├── src/
│   └── tests/
packages/
├── core/                    # agent, session, tools, scope (isolate)
├── llm/                     # providers / ctx.llm adapters
├── credentials/             # credential seam (+ credentials-local)
├── subagent/                # bot→bot / adjacent messaging primitives → Host mailbox path
├── client/                  # GUI client / connection / UI surfaces
├── host/                    # GUI host helpers
└── session/                 # durable session formats (chat progress + result projection)
specs/001-p1-wedge-multi-model/   # Spec Kit feature docs + Verifier acceptance notes
MzM-Docs/mzm-bot-plan.md          # Program plan v0.3 (direction; not tickets)
docs/designs/mzbot-wedge-to-grok-like.md
```

**Structure Decision**: Extend the existing DSH Desktop + Host monorepo layout. P1 work lands in `apps/desktop`, `apps/desktop-host`, and the named `packages/*` seams above. Do **not** add a new top-level app or parallel messaging package. Verifier acceptance scripts/notes for gate B and Electron paths live under this feature dir and/or existing test trees as tasks dictate — no new product surface invented here.

## Complexity Tracking

> No constitution violations requiring justification.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| — | — | — |

## Phase 0 & Phase 1 outputs

- Phase 0: [research.md](./research.md) — unknowns resolved against Architect freeze + plan v0.3
- Phase 1: [data-model.md](./data-model.md), [contracts/](./contracts/), [quickstart.md](./quickstart.md)

## Implementation sequencing note (for tasks)

1. **Entry gate B first** (Verifier framing handshake) — blocks Electron/Runtime feature fan-out  
2. Then multi-model bots + in-app auth + chat progress/result (US1)  
3. Then Host mailbox 1:1 (US2)  
4. Polish: documented TTFT path + Electron Verifier re-run (SC-003/SC-004)
