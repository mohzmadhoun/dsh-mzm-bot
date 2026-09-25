# Feature Specification: Phase 1 Wedge A — multi-model bots + Host 1:1 messaging

**Feature Branch**: `001-p1-wedge-multi-model`

**Created**: 2026-09-25

**Status**: Draft

**Input**: User description: "Phase 1 Wedge A — multi-model bots + Host 1:1 messaging: create ≥2 bots with different models/providers (in-app auth), async 1:1 bot→bot via Host mailbox, Shell↔Host framing handshake entry gate B before Electron/Runtime fan-out; chat-only Host; Windows-first wedge to stop Alt-Tab for model reasons."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-model team session without Alt-Tab (Priority: P1)

Mohammed opens the Desktop app, authenticates providers in-app, creates at least two bots each bound to a different model/provider, and completes a real chat work session using those bots in one place — without switching to Cursor, Claude, or another app for model reasons.

**Why this priority**: This is the measured daily pain (model lock / Alt-Tab). Without it, Phase 1 does not ship wedge value.

**Independent Test**: On a machine with configured providers, create ≥2 bots with different models, run one chat session that uses both, and confirm no external app was required for model choice. Delivers the core wedge alone.

**Acceptance Scenarios**:

1. **Given** the Desktop app is running with in-app provider credentials available for at least two distinct models/providers, **When** Mohammed creates two bots and assigns each a different model/provider, **Then** both bots persist with their assigned models and appear usable in the session UI.
2. **Given** two bots with different models exist, **When** Mohammed runs a real chat work session that uses both bots, **Then** he completes the session without leaving the Desktop app for model reasons (no Alt-Tab to Cursor/Claude or similar for choosing another model).
3. **Given** provider credentials are stored via the in-app auth path, **When** Mohammed starts a chat that needs a model, **Then** the bot uses its assigned model without requiring env/key files as the primary path, and secrets are not shown as chat/session dumps.

---

### User Story 2 - Async 1:1 bot→bot handoff (Priority: P2)

Mohammed (or a bot acting for him) sends an asynchronous one-to-one message from one bot to another. The recipient either acts on the message or the handoff is visibly shown in the product so Mohammed does not copy-paste between apps.

**Why this priority**: Bot-to-bot messaging is the second wedge pillar; multi-model without handoff still forces manual coordination.

**Independent Test**: With ≥2 bots present, send one 1:1 async message and verify recipient action or visible handoff. Valuable even before entry-gate fan-out is fully exercised.

**Acceptance Scenarios**:

1. **Given** two bots exist in the same Desktop profile, **When** bot A sends an async 1:1 message to bot B via the Host mailbox/inbox path, **Then** bot B receives the message (acts on it, or the handoff is visible to Mohammed) without copy-paste.
2. **Given** a 1:1 message was sent, **When** Mohammed inspects the session/handoff UI, **Then** he can see that a bot→bot handoff occurred (recipient acted or handoff is explicitly visible).
3. **Given** messaging is in scope for P1, **When** any 1:1 delivery path is used, **Then** delivery uses the Host mailbox/inbox only — there is no parallel Electron-side messaging bus for this flow (Verifier-provable product constraint).

---

### User Story 3 - Shell↔Host entry gate B before feature fan-out (Priority: P3)

Before Electron/Runtime feature work fans out, the Shell↔Host framing handshake (open B) must pass Verifier: framing version and handshake fields are acceptance-tested so the single allowed topology is locked.

**Why this priority**: Program gate — feature fan-out on the wrong topology wastes the path to north star C. Entry gate B is the Verifier prerequisite for unblocking P1 Electron/Runtime work.

**Independent Test**: Run Verifier against framing version + handshake acceptance; gate fails closed until pass. Does not require full multi-model chat to prove.

**Acceptance Scenarios**:

1. **Given** the Shell↔Host connection is starting, **When** the framing handshake (open B) runs, **Then** Verifier can prove framing version and required handshake fields are accepted under the single allowed topology: bundled-Node Desktop Host child + framed pipes + Node IPC lifecycle-only + `dsh-app://`.
2. **Given** entry gate B has not passed Verifier, **When** Electron/Runtime feature fan-out for P1 wedge work is considered, **Then** that fan-out is blocked — gate B pass is a prerequisite before feature work is treated as unblocked.
3. **Given** entry gate B has passed Verifier once on the agreed path, **When** Verifier re-runs the same handshake acceptance path, **Then** the gate remains reproducible on the Desktop app path (not a one-off manual claim).

---

### Edge Cases

- What happens when a provider credential is missing or revoked mid-session? User sees a clear failure for that bot's model use; other bots with valid credentials remain usable.
- What happens when the recipient bot is offline or not running when a 1:1 message is sent? Message remains in the Host mailbox/inbox path until the recipient can act, or the handoff remains visible as pending/undelivered — no silent drop without user-visible state.
- What happens if Mohammed tries to create a bot without selecting a model/provider? Creation does not complete as a usable multi-model bot until a model/provider is assigned.
- What happens if handshake framing version mismatches? Entry gate B fails; Electron/Runtime feature fan-out stays blocked until Verifier passes.
- What happens if a tool attempts external send/post? Tool is denied; P1 tools cannot send/post externally; no MCP in P1.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001 (topology)**: The product MUST expose exactly one Shell↔Host topology for P1: bundled-Node Desktop Host child process, framed pipes for framed traffic, Node IPC for lifecycle-only signals, and `dsh-app://` as the app protocol. Verifier MUST be able to prove this constraint without treating alternate topologies as in-scope.
- **FR-002 (entry gate B)**: Framing version and handshake fields MUST be acceptance-testable. Electron/Runtime feature fan-out for P1 MUST remain blocked until Verifier passes entry gate B (framing handshake open B).
- **FR-003 (chat-only Host)**: The Desktop Host for P1 MUST support chat sessions, LLM adapters, and a tools registry **without** local shell/box backends. Box/Shell execution is out of P1.
- **FR-004 (per-bot model)**: Each bot MUST be assignable to its own model/provider via Host isolate / `ctx.llm` (or equivalent Host-scoped model context). Agent scopes MUST be isolated; bots MUST NOT share tool privilege across scopes.
- **FR-005 (async 1:1)**: Async bot→bot 1:1 messaging MUST use the Host mailbox/inbox only. The product MUST NOT provide a parallel Electron messaging bus for this flow.
- **FR-006 (in-app auth)**: Primary credential path MUST be in-app (Electron main → OS secure store / Host credential seam). Environment variables and key files MUST be allowed for dev/CI only, not as the primary user path. Secrets MUST NOT appear in session dumps.
- **FR-007 (basic bot create)**: Users MUST be able to create bots through a user-initiated basic create flow (sufficient for ≥2 bots with different models). Personas richness beyond basic create is out of P1.
- **FR-008 (chat progress + result)**: During a chat session the UI MUST show progress updates and deliver a final result. Chat chrome beyond progress + final delivery is out of P1.
- **FR-009 (trust floor — tools)**: Tools available in P1 MUST NOT send or post externally. MCP MUST NOT be enabled in P1. Sessions MUST NOT be credential dumps.
- **FR-010 (single Desktop profile)**: P1 MUST use the same Desktop Host instance and one `$DSH_HOME/profiles/desktop` profile for this wedge.
- **FR-011 (providers)**: Users MUST be able to configure and use at least the provider set GPT / Claude / Grok / DeepSeek as available in their configuration for per-bot assignment.
- **FR-012 (Verifier Electron path)**: DH Verifier MUST be able to re-run an acceptance path on the real Desktop (Electron) app for the multi-model session and for entry gate B.

### Key Entities

- **Bot (agent)**: User-created agent with its own model/provider assignment and isolated scope; participates in chat and 1:1 messaging.
- **Model / provider binding**: Association of a bot to a specific LLM provider and model, used for that bot's chat turns.
- **Chat session**: User-visible conversation with progress updates and a final result; not a credential store.
- **Host mailbox / inbox message**: Async 1:1 bot→bot message delivered only through the Host mailbox path; carries handoff visibility or recipient action.
- **Desktop profile**: The single `$DSH_HOME/profiles/desktop` profile used by the Desktop Host for P1.
- **Framing handshake (entry gate B)**: Versioned Shell↔Host handshake whose acceptance is the Verifier gate before feature fan-out.
- **Credential (in-app)**: Provider secret held via OS secure store / Host credential seam; primary auth path for users.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mohammed can create ≥2 bots with **different** models/providers and complete a real work chat session in the Desktop app without opening Cursor, Claude, or similar for model reasons.
- **SC-002**: One bot can send an async 1:1 message to another such that the recipient acts **or** the handoff is visible to Mohammed — without copy-paste between apps.
- **SC-003**: Time-to-first multi-model team session is under 30 minutes on a clean machine, with the path documented.
- **SC-004**: DH Verifier can re-run the acceptance path on the real Electron Desktop app (multi-model session path).
- **SC-005**: Entry gate B (framing handshake) is a Verifier-pass prerequisite before Electron/Runtime P1 feature fan-out is considered unblocked; Verifier can prove framing version + handshake field acceptance under the single allowed Shell↔Host topology.

## Out of Scope (P1 explicit)

The following are **out** of this feature and MUST NOT be treated as P1 acceptance:

- Box / Shell local backends
- MCP / connectors productization
- Group channels
- Voice
- Send-on-behalf
- User machines (registered remote computers)
- Pixel-perfect Grok chrome
- CreateAgent-from-peer
- Event-driven routines
- 1Password / connector vault (deferred; P6-class)
- Skills UX
- Memory productization
- Personas richness beyond basic create (job/voice/anti-jobs/avatar polish → later phase)
- Chat chrome beyond progress updates + final result delivery

## Assumptions

- Windows first (Mohammed_Laptop); mac/linux packaging not required for P1 wedge exit.
- Target providers are GPT / Claude / Grok / DeepSeek as the user has configured; availability depends on user accounts/keys.
- Unsigned / local Desktop builds are acceptable for the wedge; signed distribution is deferred.
- Auth primary path is locked as in-app (Electron main → OS secure store / Host credential seam); env/keys are dev/CI only.
- Program plan v0.3 and constitution v1.0.0 bind: wedge-first A→C; Host mailbox only; no parallel Electron messaging bus; Verifier gates Done.
- Shell↔Host topology and Host mailbox are **accepted product/architecture constraints** from constitution + Architect freeze — stated here as Verifier-provable constraints, not as implementation tutorials.
- Single Desktop Host + one `$DSH_HOME/profiles/desktop` for P1.
