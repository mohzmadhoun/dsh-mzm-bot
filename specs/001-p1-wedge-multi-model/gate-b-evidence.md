# Gate B evidence (T008 / MOH-14)

**Branch**: `001-p1-wedge-multi-model`
**Date**: 2026-09-25 (Africa/Cairo)
**Harness**: Vitest Desktop path under `apps/desktop/tests/`

## Verifier commands

```bash
pnpm exec vitest run apps/desktop/tests/gate-b-topology.spec.ts apps/desktop/tests/gate-b-handshake.spec.ts
```

Related Host lifecycle coverage (recommended with Gate B):

```bash
pnpm exec vitest run apps/desktop/tests/host-process.spec.ts
```

Combined:

```bash
pnpm exec vitest run apps/desktop/tests/gate-b-topology.spec.ts apps/desktop/tests/gate-b-handshake.spec.ts apps/desktop/tests/host-process.spec.ts
```

## Run 1 — PASS

- Log: `specs/001-p1-wedge-multi-model/gate-b-run1.log`
- Result: **20 passed** (gate-b-topology + gate-b-handshake + host-process)

## Run 2 — PASS (reproducible, SC-005)

- Log: `specs/001-p1-wedge-multi-model/gate-b-run2.log`
- Result: **20 passed**

## Mapping

| Task | Artifact |
|------|----------|
| T004 / MOH-10 | `apps/desktop/tests/fixtures/gate-b-handshake.json` + handshake field enums in `apps/desktop/src/host-framing.ts` |
| T005 / MOH-13 | `apps/desktop/tests/gate-b-topology.spec.ts` |
| T006 / MOH-12 | `apps/desktop/tests/gate-b-handshake.spec.ts` (+ Host start fail-closed in `host-process.ts`) |
| T007 / MOH-15 | `specs/001-p1-wedge-multi-model/quickstart.md` step 0 hard prerequisite |
| T008 / MOH-14 | this file + run1/run2 logs |

## Topology proved

1. Bundled-Node Desktop Host child (`DesktopHostProcess` spawn)
2. Framed pipes app bus (stdio fd 4; `channels.unaryRpc|remoteStreams|assets = framed`)
3. Node IPC lifecycle-only: `ready` \| `fatal` \| `shutdown` \| `shutdown-complete` \| `update-tasks`
4. App protocol `dsh-app://` (`SCHEME` / `DESKTOP_APP_PROTOCOL`)

Loopback HTTP/WS is **not** declared or wired as the app bus (`main.ts` returns framed-pipe boot facts; no `ws://127.0.0.1` app-bus headers).

## Unpark

**MOH-14 / T008 PASS** unparks Runtime + US1 (T011+) feature fan-out.
