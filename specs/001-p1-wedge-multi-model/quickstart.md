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

### 0) Entry gate B (blocks feature fan-out)

1. Start Desktop so Shell spawns bundled-Node Desktop Host child.
2. Run DH Verifier framing handshake acceptance (see `contracts/entry-gate-b-framing.md`).
3. **Expected**: PASS on framing version + required handshake fields under topology: framed pipes + Node IPC lifecycle-only + `dsh-app://`.
4. **If FAIL**: stop — do not treat Electron/Runtime wedge feature work as unblocked.

### 1) Multi-model team session (SC-001 / SC-003 / SC-004)

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
