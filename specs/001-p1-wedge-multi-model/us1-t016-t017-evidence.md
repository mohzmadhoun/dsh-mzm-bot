# US1 evidence — T016 / T017 (MOH-18 / MOH-20)

**Branch**: `001-p1-wedge-multi-model`
**Date**: 2026-09-25 (Africa/Cairo)
**Spec**: FR-003 (chat-only Host), FR-009 (trust floor — tools / MCP / no credential dumps)

## Verifier re-run

```bash
pnpm exec vitest run apps/desktop-host/tests/chat-only-trust-floor.spec.ts
```

## Mapping

| Task | Linear | Artifact |
|------|--------|----------|
| T016 | MOH-18 | `apps/desktop-host/src/chat-only-trust-floor.ts` (`DesktopChatOnlyTrustFloor` + profile audit/patch) + Host wire in `apps/desktop-host/src/index.ts` |
| T017 | MOH-20 | Same service: `tools.guard` deny for external send/post; `sanitizeSessionSurface` / `sessionSafeModelBinding` |
| Proof | — | `apps/desktop-host/tests/chat-only-trust-floor.spec.ts` |

## What PASS proves

1. **Chat-only composition** — required Cordis services `tools` + `llm` + `sessions` present; forbidden backends `shell` + `mcpResources` absent under `strictBackends: true`.
2. **Profile audit** — active base-bundle row ids (`tool-bash`, `mcp-resources`, `tool-web`, …) flagged; `desktopChatOnlyProfilePatch()` exports `disabled: true` rows for T018 profile wiring.
3. **External send/post denied** — `web_fetch` / `web_search` / `bash` / `pwsh` / `list_mcp_resources` / `mcp__*` fail at the global `tools.guard` with a FR-009 reason; non-external tools still execute.
4. **Host boot tolerance** — with `strictBackends: false` (current Desktop Host wire), leftover shell backend is reported in `compositionStatus()` but capability gate still denies `bash`.
5. **No secret dumps** — `sanitizeSessionSurface` strips `apiKey` / `password` / `token` / `authorization` / etc. while keeping `credentialRef`; bot binding session projection has no raw secrets.

## Out of this land (still open)

- **T018**: apply `desktopChatOnlyProfilePatch()` (or equivalent) to `$DSH_HOME/profiles/desktop` so live Host compositionStatus becomes `chatOnly: true` without relying on soft backend tolerance.
- T013+ Electron in-app auth / bot create UI / chat progress chrome
- US2 mailbox (T023+)

## Chat-only note

Host boot mounts `DesktopChatOnlyTrustFloor` with `strictBackends: false` because the shipped web/base profile still includes shell/web/MCP rows until T018. Enforcement for FR-009 is live via `tools.guard` regardless. Verifier units prove the strict chat-only mount and the soft-boot deny path.
