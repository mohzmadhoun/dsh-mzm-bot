# Research: Phase 1 Wedge A — multi-model bots + Host 1:1

**Branch**: `001-p1-wedge-multi-model` | **Date**: 2026-09-25  
**Sources**: `spec.md`, `.specify/memory/constitution.md`, `MzM-Docs/mzm-bot-plan.md` v0.3, `docs/designs/mzbot-wedge-to-grok-like.md`, Architect seam freeze, existing `apps/desktop` + `apps/desktop-host` + `packages/*`

## R1 — Shell↔Host topology

**Decision**: Single allowed topology — bundled-Node Desktop Host child + framed pipes (framed traffic) + Node IPC (lifecycle-only) + `dsh-app://`.

**Rationale**: Program plan P1 entry gate and room freeze; constitution seam honesty; existing Desktop already spawns Host via Electron Node-mode child (`apps/desktop/src/host-process.ts`) with lifecycle protocol version (`DESKTOP_HOST_PROTOCOL_VERSION`). Alternate topologies are out of P1 and fail Verifier gate B.

**Alternatives considered**:
- Separate standalone Host process outside Desktop packaging — rejected (breaks Desktop profile + wedge packaging path)
- Electron-only IPC for framed chat traffic — rejected (Architect: framed pipes for framed traffic; IPC lifecycle-only)
- Multiple concurrent Host topologies — rejected (FR-001 single topology)

## R2 — Entry gate B before feature fan-out

**Decision**: Framing version + required handshake fields are Verifier-acceptance-tested; Electron/Runtime P1 feature fan-out stays blocked until gate B passes; gate must be re-runnable on Desktop path.

**Rationale**: Spec US3 / FR-002 / SC-005; plan v0.3 entry gate; prevents building wedge features on wrong wire.

**Alternatives considered**:
- Prove topology only in docs/review — rejected (constitution: Verifier gates Done)
- Defer handshake tests until after multi-model UI — rejected (program gate order)

## R3 — Per-bot model / provider binding

**Decision**: Each bot binds to its own model/provider via Host isolate / `ctx.llm` (or equivalent Host-scoped model context). Agent scopes isolated; no shared tool privilege across bots.

**Rationale**: Wedge differentiator; FR-004; constitution I/III; existing `packages/core` agent/scope + `packages/llm` adapters.

**Alternatives considered**:
- Single global model with UI label only — rejected (does not stop Alt-Tab)
- Renderer-side provider SDKs — rejected (secrets/trust floor; Host owns LLM)

## R4 — Async 1:1 messaging path

**Decision**: Async bot→bot 1:1 uses Host mailbox/inbox only. Recipient acts or handoff is visible. No parallel Electron messaging bus.

**Rationale**: FR-005; constitution V; plan trust floor; maps to existing subagent/adjacent messaging primitives under Host — not a new Electron EventEmitter bus.

**Alternatives considered**:
- Electron ipcMain broadcast bus for bot mail — rejected (forbidden parallel bus)
- Group channels / shared threads — deferred (P1 Out)
- Sync only / blocking handoff — rejected (spec requires async + pending visibility)

## R5 — Auth / credentials

**Decision**: Primary path = in-app (Electron main → OS secure store / Host credential seam). Env/key files = dev/CI only. Secrets must not appear in session dumps. 1Password/connector vault deferred to P6.

**Rationale**: Mohammed ship/no-ship 2026-09-25; FR-006; plan §5; `packages/credentials` / `credentials-local` seams.

**Alternatives considered**:
- Env-only for users — rejected (not primary user path)
- 1Password in P1 — deferred (P6)

## R6 — Chat-only Host composition

**Decision**: P1 Desktop Host supports chat sessions, LLM adapters, tools registry **without** local shell/box backends. Tools cannot send/post externally; MCP off.

**Rationale**: FR-003 / FR-009; plan P1 In/Out; trust floor.

**Alternatives considered**:
- Enable shell/box early for “demo power” — rejected (P7; theater risk)
- Enable MCP subset — rejected (P6)

## R7 — UI sufficiency vs Grok chrome

**Decision**: Electron UI must support basic bot create, multi-model session, chat progress + final result, and visible 1:1 handoff. Pixel-perfect Grok chrome and personas richness are out.

**Rationale**: SC-001–SC-002; FR-007/FR-008; constitution III.

**Alternatives considered**:
- Full Grok chrome in P1 — rejected (theater; north-star creep)

## R8 — Verifier / test strategy

**Decision**: Prefer small Verifier-shaped acceptance units: (1) framing handshake gate B, (2) Electron multi-model session path, (3) Host mailbox 1:1 visibility/action. Reuse Vitest where it already covers Host child lifecycle; do not replace Verifier with ad-hoc manual claims.

**Rationale**: Constitution IV; SC-004/SC-005; FR-012.

**Alternatives considered**:
- Manual demo only — rejected (not Done)
- Only unit tests without Electron path — rejected (SC-004)

## R9 — Profile / home

**Decision**: One Desktop Host + `$DSH_HOME/profiles/desktop` for the wedge.

**Rationale**: FR-010; trust floor; simplifies Verifier matrix.

**Alternatives considered**: Multi-profile P1 — rejected (out of wedge)

## Unresolved → resolved checklist

| Former unknown | Resolution |
|----------------|------------|
| Topology choice | Locked (R1) |
| Gate order | Gate B before fan-out (R2) |
| Auth primary | In-app (R5) |
| Messaging bus | Host mailbox only (R4) |
| Box/MCP in P1 | Out (R6) |
| Provider set | GPT/Claude/Grok/DeepSeek as configured (spec) |

No remaining NEEDS CLARIFICATION items for planning.
