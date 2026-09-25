# MzM Bot — Final Project Plan

| Field | Value |
|-------|-------|
| **Status** | **ACCEPTED v0.3 — Spec LGTM 2026-09-25**; auth locked in-app; P1 `/speckit-specify` in flight |
| **Date** | 2026-09-25 |
| **Owners** | DH Product Owner Assistant (draft) · DH Spec (requirements review) · DH Lead (gates) · DH Architect (seams) |
| **Repo** | `C:\Users\Mohammed\Desktop\DSH - MzM Bot` (`mohzmadhoun/dsh-mzm-bot`) |
| **Inputs** | `MzM-Docs/mzm-bot-initial-plan.md` · `docs/designs/mzbot-wedge-to-grok-like.md` · `.specify/memory/constitution.md` · MzM Bot Plan room freeze |

This is the **solid program plan** for MzM Bot (DeepSeek Harness → GrokBot-like Electron). It is **not** a Spec Kit feature spec. Spec Kit runs **per phase** after this plan is accepted.

---

## 1. Product goal

**North star (C):** A DeepSeek Harness Electron desktop that feels GrokBot-like — multi-bot team with personas, skills, routines, memory, connectors, easy UI, and bot-to-bot — **plus** MzM’s differentiator: **per-bot model/provider**.

**First ship (A / Phase 1):** Stop Mohammed’s daily Alt-Tab for model reasons:

1. Create ≥2 bots with **different** models/providers.
2. **Async 1:1** bot→bot messaging (recipient acts or handoff is visible).
3. Electron UI good enough for a real work session — **not** Grok chrome parity.

**Customer:** Mohammed (founder = user). Measured pain = model lock on one stack.

---

## 2. Non-goals (program-level)

- Do not specify or build full Grok parity in one Spec Kit feature.
- Do not invent Linear tickets from this plan or the inventory — tickets come from Spec Kit `tasks` / `taskstoissues` **per phase**.
- Do not treat design docs or `mzm-bot-initial-plan.md` as the live board.
- Do not fork a parallel messaging bus in Electron (Host mailbox only).
- Do not put local Shell/box into Phase 1.
- Do not expand team/bots without Mohammed asking.

---

## 3. Strategy lock (A→C)

| Letter | Meaning |
|--------|---------|
| **A** | Wedge: per-bot models + basic 1:1 messaging + usable Electron UI on durable DSH seams |
| **C** | Full GrokBot-comparable product surface on DSH |
| **A→C** | Chosen path: ship A first; later phases cherry-pick from the inventory toward C |

Constitution principles still bind: wedge-first, Spec-driven delivery, product over theater, verify against spec, seam honesty.

---

## 4. Clear phases

Each phase = one Spec Kit loop: `specify → clarify → plan → tasks → analyze → implement`.  
**DH Verifier gates Done every phase** (never deferred to P7).

### P0 — Foundation (baseline, done)

| | |
|--|--|
| **In** | Spec Kit constitution v1.0.0; Spec Kit + gstack init; A→C design doc; AGENTS.md commit format; Grok inventory (`mzm-bot-initial-plan.md`) |
| **Out** | Feature ship; Linear board fill |
| **Exit** | Constitution ratified; tooling present; this plan accepted |
| **Status** | Done — plan ACCEPTED v0.3 |

### P1 — Wedge A (next)

| | |
|--|--|
| **Entry gate (before Electron/Runtime fan-out)** | Shell↔Host topology locked: **bundled-Node Desktop Host child + framed pipes + Node IPC lifecycle-only + `dsh-app://`**. Framing handshake (open B) must pass Verifier before feature tasks. |
| **In** | Chat-only Host (sessions + llm adapters + tools registry **without** local shell backends); **user-initiated basic bot create**; per-bot model via Host isolate/`ctx.llm`; async 1:1 via **Host mailbox/inbox only**; **chat progress updates + final result delivery**; Electron shell UI sufficient for design success criteria; trust floor (below) |
| **Out** | Box/Shell; MCP; group channels; voice; send-on-behalf; user machines; pixel Grok chrome; CreateAgent-from-peer; event-driven routines; 1Password connector; chat chrome beyond progress+final delivery |
| **Exit (Verifier-provable)** | ≥2 bots, different models; real session without Alt-Tab for model reasons; recipient acts or handoff visible; TTFT multi-model team session < 30 min on clean machine (documented); Verifier re-runs that path on Electron |
| **Pre-specify blocker** | Auth path **named and locked** (in-app) — cleared for specify once Spec LGTMs this plan |

### P2 — Identity / personas

| | |
|--|--|
| **In** | Job/voice/anti-jobs; rename/avatar; sidebar sections; delete-confirm; **ADR only** for agent vs user memory layers (no memory UX) |
| **Out** | Memory productization (P5); skills library (P3) |
| **Exit (Verifier-provable)** | User can create/rename/delete (with confirm) bots and edit job, voice, anti-jobs, avatar, sidebar section; anti-jobs persist on the profile and appear in bot overview; Verifier re-runs that path |

### P3 — Skills UX

| | |
|--|--|
| **In** | Load/discover + authoring; thin managed pack (not every playbook) |
| **Out** | Full managed skill catalog parity; learn-from-demonstration |
| **Exit** | User can attach/run a skill on a bot; Verifier covers load + one authoring path |

### P4 — Routines (cron only)

| | |
|--|--|
| **In** | Create/pause/resume + pane list; Host jobs; **no** event listeners |
| **Out** | Slack/GitHub/email/etc triggers (P6); recall UX (P5) |
| **Exit** | Cron routine fires and is visible in pane; pause/resume verified |

### P5 — Memory productization

| | |
|--|--|
| **In** | Profile / log / note + recall UX |
| **Out** | Full Grok memory chrome parity beyond agreed ADR |
| **Exit (Verifier-provable)** | Write profile/log/note fact → restart → recall returns it; Verifier scripted path documented |

### P6 — Connectors / MCP + event routines + trust productization

| | |
|--|--|
| **In** | MCP/connectors; event-triggered routines; richer trust/permissions productization; 1Password-class credential UX if needed |
| **Out** | Box/computer parity (P7) |
| **Exit (Verifier-provable)** | One connector: install → auth → successful tool call; one event-triggered routine fires end-to-end; one denied-permission path proven; secrets absent from session dumps |

### P7 — Computer / box + subagent parity + settings chrome

| | |
|--|--|
| **In** | Box/Shell backends; computerUse-class subagents; settings/chrome polish toward Grok-easy |
| **Out** | Treating “Verifier” as a P7 feature — Verifier already gates every phase |
| **Exit (Verifier-provable)** | One local Shell/box tool path proven; one computerUse-class subagent path proven; settings rows required for those daily paths present (chrome polish ≠ Verifier substitute) |

---

## 5. Auth recommendation (pre-specify ship/no-ship)

| Option | Role |
|--------|------|
| **In-app (LOCKED primary — Mohammed 2026-09-25)** | Electron main → OS secure store / Host credential seam. Secrets off renderer; not in session dumps. Matches P1 trust floor. |
| **Env / key files** | Dev/CI only |
| **1Password / connector vault** | Wait for **P6** |

**Decision:** Mohammed ship/no-ship **accepted** — P1 auth primary = **in-app**. Env/keys = dev/CI only. 1Password/connectors wait for P6.

---

## 6. P1 trust floor (Architect lock)

- Same Desktop Host + one `$DSH_HOME/profiles/desktop`
- Isolated agent scopes (per-bot model; no shared tool privilege)
- Async 1:1 = Host mailbox — **no Electron parallel bus**
- Named auth path (above)
- Tools that cannot send/post externally
- No MCP in P1
- Sessions are not credential dumps

---

## 7. Spec Kit + Linear hang

| When | What |
|------|------|
| Once | `/speckit-constitution` (done) |
| Each phase | `specify → clarify → plan → tasks → analyze → implement` |
| After `tasks` | `/speckit-taskstoissues` → Linear (one milestone/epic per phase; no pre-loading later phases) |
| Always | Design docs + this plan = direction; Linear = live tasks only |

**Do not** run Spec Kit specify until: (1) this plan accepted, (2) auth primary ship/no-ship’d.

---

## 8. Roles & gates

| Role | Owns |
|------|------|
| **Mohammed** | Ship / no-ship (auth, phase exits, releases) |
| **DH Lead** | Phase gates, handoffs, living plan coherence |
| **DH Spec** | Spec Kit artifacts, acceptance criteria, clarify |
| **DH Architect** | Seam map, topology, plugin ownership |
| **DH Electron / Runtime** | Shell vs Host implementation within accepted plan |
| **DH Verifier** | Done evidence every phase |
| **DH Product Owner Assistant** | Scope cuts, backlog order, plan updates |

---

## 9. Inventory → phase map (cut list)

Source: `MzM-Docs/mzm-bot-initial-plan.md` §16–17 + Appendix B.

| Inventory area | Phase |
|----------------|-------|
| Per-bot multi-model (MzM wedge) | **P1** |
| User-initiated basic bot create | **P1** |
| Chat progress updates + final result delivery | **P1** |
| Basic async 1:1 multi-agent | **P1** |
| Shell↔Host topology / Electron usable UI | **P1** |
| Personas / anti-jobs / sidebar / delete | **P2** |
| Skills UX | **P3** |
| Routines cron | **P4** |
| Memory productization | **P5** |
| Connectors / MCP / event routines / rich trust | **P6** |
| Box / subagents / settings chrome | **P7** |
| Voice, draft-first send-on-behalf, group channels, user machines, learn-from-demo, billing chrome, full skill pack, pixel Grok | **Explicitly OUT** until a later named phase amends this plan |

---

## 10. Immediate next gates

1. **@DH Spec** re-reads v0.3 — **LGTM or residual edits** (specify blocked until LGTM).
2. ~~Mohammed ship/no-ship on auth~~ **DONE** — in-app primary.
3. On Spec LGTM: `/speckit-specify` for **P1 only** (entry gate + wedge scope).
4. Then clarify → plan → tasks → Linear; Electron/Runtime only after topology handshake Verifier pass.

---

## 11. Change control

Amendments to phases or P1 exit criteria require: PO draft → Spec/Lead/Architect ack → Mohammed ship/no-ship if scope or decision rights change. Bump this doc’s status line (v0.1 → v0.2…).

---

## 12. Room freeze record

Frozen 2026-09-25 in channel **MzM Bot Plan** by DH Spec / DH Lead / DH Architect / DH Product Owner Assistant:

- P4 cron before P6 events (do not bundle)
- P1 chat-only; box → P7
- One shell↔Host topology only (bundled-Node Desktop Host child + framed pipes + …)
- Auth primary **LOCKED**: in-app (Mohammed 2026-09-25)
- Verifier every phase
- v0.3 Spec four-edit patch: P2 exit (no “anti-job visibility”); §9 + P1 In basic create + chat progress/final; P6/P7 Verifier-provable exits


## Changelog

- **v0.3 ACCEPTED** (2026-09-25): DH Spec LGTM. Gate clear for /speckit-specify P1 only.

