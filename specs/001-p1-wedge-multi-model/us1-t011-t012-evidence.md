# US1 first land evidence — T011 / T012 (MOH-16 / MOH-22)

**Branch**: `001-p1-wedge-multi-model`
**Date**: 2026-09-25 (Africa/Cairo)
**Contract**: `specs/001-p1-wedge-multi-model/contracts/per-bot-model-binding.md`
**Trust floor**: chat-only Host (sessions + llm adapters + tools registry); no Shell/box backends; MCP off.

## Verifier re-run

```bash
pnpm exec vitest run apps/desktop-host/tests/bot-bindings.spec.ts
```

## Mapping

| Task | Linear | Artifact |
|------|--------|----------|
| T011 | MOH-16 | `apps/desktop-host/src/bot-bindings.ts` (`DesktopBotBindings`) + Host wire in `apps/desktop-host/src/index.ts` |
| T012 | MOH-22 | Same service: per-bot `createScope` + scope-local tools not visible/executable by siblings |
| Proof | — | `apps/desktop-host/tests/bot-bindings.spec.ts` |

## What PASS proves

1. **Per-bot model/provider binding** — `createBot` requires wedge provider (`gpt` \| `claude` \| `grok` \| `deepseek`) + non-empty `modelId`; draft bots are not usable until `assignBinding`.
2. **Isolate / ctx.llm routing** — each bot gets `createScope` + `installModelSelection`; prompt assembly with `{ scope: bot.scopeKey }` yields that bot’s `provider` / `model` (Host `ctx.llm` request routing intent).
3. **No shared tool privilege** — scope-local tools registered on bot A are absent from bot B’s schemas/`get` and fail execute as unknown tool; not listed on the global Host tools view.

## Out of this land (still open)

- T013+ Electron in-app auth / bot create UI / chat progress chrome
- T016 explicit chat-only composition audit vs full desktop profile rows
- Framed `unaryRpc` past-503 for `dsh-app://` non-static paths (not required to prove T011/T012)
- US2 mailbox (T023+)

## Chat-only note

`DesktopBotBindings` depends only on `tools` + `systemPrompt` (plus agent model-selection helpers). It does not register Shell, box, or MCP backends.
