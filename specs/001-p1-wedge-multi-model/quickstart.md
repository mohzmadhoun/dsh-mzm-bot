# Quickstart validation: Phase 1 Wedge A

**Branch**: `001-p1-wedge-multi-model`  
**Date**: 2026-09-25  
**Audience**: DH Verifier / implementers validating acceptance (not a full install guide)

## Prerequisites

- Windows machine (Mohammed_Laptop path)
- Repo at feature branch `001-p1-wedge-multi-model`
- Node per repo engines; pnpm workspace install already usable for Desktop
- In-app provider credentials for **at least two** distinct models/providers among GPT / Claude / Grok / DeepSeek
- Unsigned/local Desktop build acceptable (`package:desktop:win:*` / `dev:desktop` as available)

## Validation order (mandatory)

### 0) Entry gate B (blocks feature fan-out) — **hard prerequisite**

Gate B MUST PASS before any Electron/Runtime P1 feature fan-out (T011+). Soft claims are not enough.

**Verifier commands** (run from repo root; run twice for SC-005 / T008):

```bash
pnpm exec vitest run apps/desktop/tests/gate-b-topology.spec.ts apps/desktop/tests/gate-b-handshake.spec.ts
```

Optional focused filters:

```bash
pnpm exec vitest run apps/desktop/tests/gate-b-topology.spec.ts
pnpm exec vitest run apps/desktop/tests/gate-b-handshake.spec.ts
```

**What PASS proves** (see `contracts/entry-gate-b-framing.md` + `apps/desktop/tests/fixtures/gate-b-handshake.json`):

1. Topology: bundled-Node Desktop Host child + **framed pipes** app bus + Node IPC **lifecycle-only** (`ready`|`fatal`|`shutdown`|`shutdown-complete`|`update-tasks`) + `dsh-app://`.
2. Handshake accept: `framingVersion`, `hostProtocolVersion` (=`DESKTOP_HOST_PROTOCOL_VERSION` / 4), `profileId`=`desktop`, `dshExactVersion`, `clientAssetRevision`, `channels` with `unaryRpc`+`remoteStreams`+`assets` framed (no loopback HTTP app bus).
3. Fail-closed on missing/type/version/profileId/forbidden channel/IPC outside allowlist.

**If FAIL**: stop — do not unpark Runtime / US1 feature work.

**Evidence**: `specs/001-p1-wedge-multi-model/gate-b-evidence.md` (T008 double-run).


### 1) Multi-model team session (SC-001 / SC-003 / SC-004)

**Host unit (T011 / T012 — Runtime first land):**

```bash
pnpm exec vitest run apps/desktop-host/tests/bot-bindings.spec.ts
```

Proves: per-bot model/provider binding via isolate + `installModelSelection` → Host `ctx.llm` routing; draft not usable until bound; sibling bots do not share scope-local tool privilege (`contracts/per-bot-model-binding.md`). Evidence: `specs/001-p1-wedge-multi-model/us1-t011-t012-evidence.md`.

**Host unit (T016 / T017 — chat-only + trust floor):**

```bash
pnpm exec vitest run apps/desktop-host/tests/chat-only-trust-floor.spec.ts
```

Proves: chat-only required services (`sessions`/`llm`/`tools`) without shell/MCP backends; profile-row audit + disable patch; `tools.guard` denies external send/post (web/shell/MCP); session surfaces strip secrets and keep `credentialRef` only (FR-003/FR-009). Evidence: `specs/001-p1-wedge-multi-model/us1-t016-t017-evidence.md`.

1. Authenticate providers via **in-app** path (not env as primary).
2. Create ≥2 bots; assign **different** models/providers.
3. Run one real chat work session that uses both bots; confirm UI shows **progress** and a **final result**.
4. **Expected**: Session completes in Desktop without Alt-Tab to Cursor/Claude/etc for model reasons.
5. Document time-to-first multi-model team session on a clean machine; target **< 30 minutes** (SC-003).
6. Re-run Verifier acceptance on the real Electron Desktop path (SC-004).

### 2) Async 1:1 Host mailbox (SC-002)

1. With ≥2 bots present, send async 1:1 from bot A → bot B via Host mailbox only.
2. **Expected**: Recipient acts **or** handoff is visible; no copy-paste; no Electron parallel bus.

## Negative checks (smoke)

| Case | Expected |
|------|----------|
| Handshake version mismatch | Gate B fail; fan-out blocked |
| Create bot without model | Not usable multi-model bot until assigned |
| Missing/revoked credential mid-session | Clear failure for that bot; others still usable |
| Recipient offline | Pending/visible undelivered — no silent drop |
| Tool attempts external send/post | Denied; MCP off |

## References

- Spec: [spec.md](./spec.md)
- Plan: [plan.md](./plan.md)
- Data model: [data-model.md](./data-model.md)
- Contracts: [contracts/](./contracts/)
