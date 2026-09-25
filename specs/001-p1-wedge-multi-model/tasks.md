# Tasks: Phase 1 Wedge A — multi-model bots + Host 1:1 messaging

**Input**: Design documents from `/specs/001-p1-wedge-multi-model/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md  
**Tests**: Verifier-shaped acceptance units are **required** by FR-002 / FR-012 / SC-004 / SC-005 (not optional theater).

**Organization**: Entry **gate B first** (blocks Electron/Runtime feature fan-out), then US1 (multi-model), then US2 (mailbox 1:1). US3 acceptance is the gate phase.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no incomplete dependencies)
- **[Story]**: US1 / US2 / US3 maps to spec user stories
- Paths are repo-relative

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Orient implementers and Verifier on locked seams; no product feature code yet.

- [ ] T001 Record P1 seam freeze checklist (topology, gate B, mailbox-only, chat-only Host, in-app auth, trust floor) in `specs/001-p1-wedge-multi-model/plan.md` ownership notes cross-check (confirm unchanged vs Architect freeze)
- [ ] T002 [P] Index contract files under `specs/001-p1-wedge-multi-model/contracts/` for Verifier mapping (entry-gate-b, mailbox, per-bot-model, in-app-auth)
- [ ] T003 [P] Confirm Desktop Host child spawn path exists for gate work: `apps/desktop/src/host-process.ts` + `apps/desktop/src/host-protocol.ts` (`DESKTOP_HOST_PROTOCOL_VERSION`)

---

## Phase 2: Foundational — Entry Gate B (US3) ⛔ BLOCKS FEATURE FAN-OUT

**Purpose**: Prove Shell↔Host framing handshake under the single allowed topology before any Electron/Runtime wedge feature fan-out.

**Goal (US3)**: Framing version + required handshake fields acceptance-tested; fail-closed until pass; reproducible on Desktop path.

**Independent Test**: Run Verifier gate B only — does not require multi-model chat.

- [ ] T004 [US3] Define Verifier fixture enumerating required framing handshake fields + accepted framing version in `specs/001-p1-wedge-multi-model/contracts/entry-gate-b-framing.md` (fill field list placeholders with concrete names from Host protocol)
- [ ] T005 [US3] Implement Verifier acceptance unit proving topology lock (bundled-Node Desktop Host child + framed pipes + Node IPC lifecycle-only + `dsh-app://`) under `apps/desktop/tests/` or `specs/001-p1-wedge-multi-model/` Verifier harness path agreed by Verifier
- [ ] T006 [US3] Implement Verifier acceptance unit for framing version + required handshake field acceptance (open B) on Desktop startup path; fail-closed on mismatch
- [ ] T007 [US3] Wire gate B result as hard prerequisite flag/doc checkpoint so Electron/Runtime P1 feature tasks remain blocked until PASS (document in `specs/001-p1-wedge-multi-model/quickstart.md` step 0)
- [ ] T008 [US3] Re-run gate B twice on Desktop path and record reproducible PASS evidence (SC-005)

**Checkpoint**: Gate B PASS required before Phase 3+. If FAIL, stop fan-out.

---

## Phase 3: User Story 1 — Multi-model team session (Priority: P1) 🎯 MVP

**Goal**: ≥2 bots with different models/providers; real chat session with progress + final result; in-app auth; no Alt-Tab for model reasons.

**Independent Test**: Create ≥2 differently modeled bots; run one session using both inside Desktop.

### Verifier / acceptance (required by spec)

- [ ] T009 [P] [US1] Add Verifier acceptance outline for Electron multi-model session path in `specs/001-p1-wedge-multi-model/quickstart.md` §1 (map to SC-001/SC-004)
- [ ] T010 [P] [US1] Add negative acceptance checks for missing/revoked credential mid-session (that bot fails clear; others remain usable) referencing `contracts/in-app-auth-credential.md`

### Implementation (after gate B)

- [ ] T011 [P] [US1] Host: expose per-bot model/provider binding via isolate / `ctx.llm` seam in Runtime Host composition (`apps/desktop-host/` + `packages/core` / `packages/llm` as applicable) — constraint: required for usable bot
- [ ] T012 [P] [US1] Host: ensure agent scopes isolated (no shared tool privilege across bots) in Host scope wiring (`packages/core` scope/agent seams)
- [ ] T013 [US1] Electron: in-app auth primary path (Electron main → OS secure store / Host credential seam) for provider credentials; env/key files dev/CI only (`apps/desktop/src/`, `packages/credentials/`)
- [ ] T014 [US1] Electron: basic user-initiated bot create UI sufficient for ≥2 bots with model/provider assignment (`apps/desktop/` renderer/client surfaces)
- [ ] T015 [US1] Runtime+Electron: chat session shows progress updates and delivers final result (FR-008) — chat chrome beyond that out of scope
- [ ] T016 [US1] Enforce chat-only Host composition (sessions + llm adapters + tools registry **without** local shell/box backends); MCP disabled (FR-003/FR-009)
- [ ] T017 [US1] Enforce tools cannot send/post externally; sessions must not dump secrets (trust floor)
- [ ] T018 [US1] Single Desktop Host + `$DSH_HOME/profiles/desktop` profile wiring for wedge (FR-010)
- [ ] T019 [US1] Provider configuration path supports GPT / Claude / Grok / DeepSeek as available (FR-011)
- [ ] T020 [US1] DH Verifier: re-run Electron Desktop multi-model session acceptance path (SC-004 / FR-012)

**Checkpoint**: US1 independently demonstrable; Alt-Tab pain addressed for model reasons.

---

## Phase 4: User Story 2 — Async 1:1 Host mailbox (Priority: P2)

**Goal**: Async bot→bot 1:1 via Host mailbox only; recipient acts or handoff visible; no Electron parallel bus.

**Independent Test**: With ≥2 bots, send one 1:1 async message; verify act or visible handoff.

### Verifier / acceptance

- [ ] T021 [P] [US2] Add Verifier acceptance checks for Host-mailbox-only delivery + visible pending/undelivered (no silent drop) per `contracts/host-mailbox-1to1.md`
- [ ] T022 [P] [US2] Add Verifier check that no Electron parallel messaging bus is used for this 1:1 flow (FR-005)

### Implementation

- [ ] T023 [US2] Runtime: Host mailbox/inbox send path for async 1:1 bot→bot (`packages/subagent/` / Host messaging seams as applicable)
- [ ] T024 [US2] Runtime: message states `pending` → `delivered` → `acted` (or failed/undelivered visible) per `data-model.md`
- [ ] T025 [US2] Electron: handoff visibility in session/UI sufficient for Mohammed to see bot→bot handoff without copy-paste
- [ ] T026 [US2] Prove absence of parallel Electron messaging bus for this flow (code + Verifier)
- [ ] T027 [US2] DH Verifier: end-to-end 1:1 acceptance (SC-002)

**Checkpoint**: US1 + US2 both independently valuable.

---

## Phase 5: Polish & Cross-Cutting

**Purpose**: Documented TTFT path, quickstart validation, scope freeze.

- [ ] T028 [P] Document clean-machine time-to-first multi-model team session path (< 30 min target) in `specs/001-p1-wedge-multi-model/quickstart.md` (SC-003)
- [ ] T029 [P] Re-validate Out-of-Scope list not implemented (box/MCP/groups/voice/send-on-behalf/user-machines/pixel chrome/CreateAgent-from-peer/event routines/1Password/skills/memory/personas richness)
- [ ] T030 Run full `quickstart.md` validation order (gate B → multi-model → 1:1) and attach Verifier evidence notes under `specs/001-p1-wedge-multi-model/`
- [ ] T031 Confirm constitution Done rule: no P1 Done without Verifier evidence against active spec

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: immediate
- **Foundational Gate B (Phase 2 / US3)**: depends on Setup — **BLOCKS** US1/US2 feature fan-out
- **US1 (Phase 3)**: only after Gate B PASS
- **US2 (Phase 4)**: after Gate B PASS; may follow or partially parallelize with US1 after T011–T014 exist (needs ≥2 bots)
- **Polish (Phase 5)**: after desired stories complete

### User Story Dependencies

- **US3 (Gate B)**: first — program entry gate (spec priority P3 but execution priority 0)
- **US1**: after gate B; no dependency on US2
- **US2**: after gate B; needs bots from US1 create path (T014) for ≥2 bots

### Parallel Opportunities

- T002–T003 after T001
- T009–T010 in parallel once Phase 3 starts
- T011–T012 in parallel (different seams)
- T021–T022 in parallel
- T028–T029 in parallel

### Parallel Example: after Gate B

```text
T011 Host per-bot ctx.llm binding
T012 Host scope isolation
T009 Verifier multi-model outline
T010 Verifier credential negative checks
```

---

## Implementation Strategy

### MVP

1. Phase 1 Setup  
2. Phase 2 Gate B PASS (mandatory)  
3. Phase 3 US1 (multi-model session)  
4. STOP — validate SC-001 / SC-004  

### Incremental

5. Phase 4 US2 (mailbox 1:1) → SC-002  
6. Phase 5 polish → SC-003 + full quickstart  

### Notes

- Do **not** start Electron/Runtime feature fan-out tasks (T011+) until T008 PASS  
- Prefer smallest change on existing DSH seams; no parallel messaging bus; no box/MCP in P1  
- Commit format: `Phase 1 - T0xx-T0yy - <imperative>` per AGENTS.md
