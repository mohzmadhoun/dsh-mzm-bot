<!--
Sync Impact Report
- Version change: (none) → 1.0.0
- Modified principles: (none — initial ratification)
- Added sections:
  - Core Principles I–V (Wedge-First Toward North Star; Spec-Driven Delivery;
    Product Over Implementation Theater; Verify Against Spec; Simplicity & Seam Honesty)
  - Stack & Seam Constraints
  - Roles & Decision Rights
  - Governance
- Removed sections: (none — new document)
- Follow-up TODOs: none
  Note: Drafted against upstream Spec Kit constitution-template structure. Parent
  MUST confirm against project resolve-template.ps1 output before commit if the
  active project template diverges from core.
-->

# MzM Bot (DeepSeek Harness) Constitution

## Core Principles

### I. Wedge-First Toward North Star (A→C)

Every phase MUST ship real, durable seams that advance first ship A toward
north star C (full Grok Bot–like abilities on DeepSeek Harness: personas,
skills, routines, memory, easy UI, bot-to-bot). Phase 1 (wedge A) MUST deliver
per-bot model/provider assignment, basic bot-to-bot messaging, and an easy
Grok-Bot-like UI on real DSH/Electron seams (agents, model/provider config,
subagent messaging, Electron shell). Work MUST NOT introduce throwaway
prototypes, one-off hacks, or parallel stacks that cannot grow into C.

**Rationale:** Mohammed's goal is C; A is the first shippable slice of C, not a
disposable demo. Seams that cannot extend waste the only scarce resource: time
to a coherent product.

### II. Spec-Driven Delivery

All feature work MUST follow Spec Kit in order: constitution → specify →
clarify → plan → tasks → analyze → implement. Linear issues MUST be created
from Spec Kit tasks only after the tasks step—not before. Design docs (including
`docs/designs/mzbot-wedge-to-grok-like.md`) are direction and context; they are
NOT tickets and MUST NOT replace specify/plan/tasks artifacts.

**Rationale:** Spec Kit is the single source of delivery truth. Skipping steps
or treating design docs as backlogs causes silent scope drift and unverifiable
"done."

### III. Product Over Implementation Theater

The team MUST prioritize user-visible value for the phase-1 wedge—multi-model
bots, bot-to-bot messaging, and an easy Grok-Bot-like UI—before polish,
parity, or infrastructure for unused Grok-like features. Work that does not
increase Mohammed's ability to run a multi-model bot team in one desktop app
MUST be deferred unless it is a required seam for that value.

**Rationale:** Customer pain is shipping slower without per-bot multi-model in
one team. Theater (unused personas/skills/routines/memory UI, premature polish)
delays relief without advancing the wedge.

### IV. Verify Against Spec

No work is Done until DH Verifier (or equivalent acceptance against the active
spec) passes. Phase 1 MUST NOT silently absorb north-star C scope
(full personas/skills/routines/memory parity). Scope changes MUST go through
specify/clarify (and constitution amendment if governance is affected)—not
through opportunistic implementation.

**Rationale:** Acceptance without a spec is opinion; silent creep into C
destroys the wedge-first strategy and makes ship/no-ship decisions ungrounded.

### V. Simplicity & Seam Honesty

Prefer the smallest change that uses existing DeepSeek Harness and Electron
seams. YAGNI applies: personas, skills, routines, and memory MUST wait for
later A→C phases unless a phase-1 acceptance criterion explicitly requires a
minimal hook. New abstractions, duplicate messaging buses, or fake "Grok-like"
surfaces that are not backed by real harness seams are forbidden.

**Rationale:** Seam honesty keeps the path to C open. Clever indirection and
premature features increase cost without proving the wedge.

## Stack & Seam Constraints

The following stack is binding as constraint context for planning and
implementation (not as implementation HOW inside specify artifacts):

- Runtime / agents: DeepSeek Harness (`deepseek-harness`)
- Desktop shell: Electron
- Agent/workflow tooling: gstack, Spec Kit, delegate-skills
- Task tracking after Spec Kit tasks: Linear

Specs MUST describe WHAT/WHY. Plans and tasks MAY name seams; they MUST NOT
replace Spec Kit with ad-hoc process. Phase 1 MUST map capabilities onto real
agent, model/provider, subagent messaging, and Electron shell seams.

## Roles & Decision Rights

- **Mohammed:** Customer and final ship / no-ship authority for releases and
  phase gates.
- **DH Lead:** Program gatekeeper—kickoff, phase priorities, handoffs across
  DH Spec / Architect / Electron / Runtime / Verifier, and living plan
  coherence.
- **DH Spec:** Owns requirements and Spec Kit specify→clarify→plan→tasks
  quality.
- **DH Architect:** Owns seam mapping and architecture notes against DSH +
  Electron.
- **DH Electron / DH Runtime:** Own shell and harness implementation within
  accepted specs/plans.
- **DH Verifier:** Owns acceptance evidence; gates Done.

No role MAY mark phase-1 Done without Verifier evidence against the active
spec. No role MAY expand phase-1 into full C features without Mohammed
ship/no-ship and an updated spec.

## Governance

- This constitution is binding on all MzM Bot / DSH program work.
- Amendments MUST be explicit, reviewed by DH Lead, and approved under
  Mohammed's ship/no-ship authority when they change phase scope or decision
  rights.
- Every amendment MUST bump `CONSTITUTION_VERSION` (semver):
  - MAJOR: backward-incompatible principle/governance removals or redefinitions
  - MINOR: new principle/section or materially expanded guidance
  - PATCH: clarifications, wording, non-semantic refinements
- Compliance: `/speckit-plan` Constitution Check and `/speckit-analyze` MUST
  treat MUST-level conflicts as blocking. Violations are fixed by changing
  spec/plan/tasks—or by amending this constitution—not by ignoring a principle.
- Design docs remain directional; they do not amend this constitution.

**Version**: 1.0.0 | **Ratified**: 2026-09-18 | **Last Amended**: 2026-09-18
