# Contract: Per-bot model / provider binding

**Feature**: `001-p1-wedge-multi-model`  
**Owns acceptance**: DH Verifier (+ Runtime isolate/`ctx.llm`, Electron create UI)  
**Related**: FR-004, FR-007, FR-011, SC-001, User Story 1

## Purpose

Each bot has its own model/provider assignment via Host isolate / `ctx.llm` (or equivalent Host-scoped model context).

## Interface rules

| Rule | Requirement |
|------|-------------|
| Assignment | User can assign a distinct model/provider per bot at basic create time |
| Isolation | Agent scopes isolated; bots MUST NOT share tool privilege across scopes |
| Providers | At least GPT / Claude / Grok / DeepSeek as available in user configuration |
| Persistence | Binding survives restart of the Desktop profile session for wedge use |
| Usability gate | Bot is not a usable multi-model participant until a model/provider is assigned |

## Observable acceptance

Create ≥2 bots with **different** models/providers; both appear usable in session UI; a real chat session can use both without leaving the Desktop app for model reasons.

## Non-goals

- Personas richness (job/voice/anti-jobs/avatar polish)
- Cross-bot shared model pool UI beyond per-bot assignment
