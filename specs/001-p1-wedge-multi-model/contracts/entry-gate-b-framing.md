# Contract: Entry gate B — Shell↔Host framing handshake

**Feature**: `001-p1-wedge-multi-model`  
**Owns acceptance**: DH Verifier  
**Related**: FR-001, FR-002, SC-005, User Story 3  
**Binding**: Architect + PO freeze 2026-09-25 (handshake fields + lifecycle IPC allowlist)

## Purpose

Prove the single allowed Shell↔Host topology and that framing version + required handshake fields are accepted before Electron/Runtime P1 feature fan-out.

## Topology lock (MUST)

Verifier MUST observe exactly:

1. Bundled-Node **Desktop Host child** (spawned by Electron Desktop)
2. **Framed pipes** carry framed traffic
3. **Node IPC** used for **lifecycle-only** signals (not framed chat/rpc bus substitute)
4. App protocol **`dsh-app://`**

Any alternate topology is out of scope and MUST fail this gate.

## Lifecycle IPC allowlist (MUST)

Node IPC MAY carry only these lifecycle signals:

- `ready`
- `fatal`
- `shutdown`
- `shutdown-complete`
- `update-tasks`

Node IPC MUST NOT carry chat, RPC, or any framed app bus substitute. Violation → gate **fail**.

## Handshake acceptance

| Check | Requirement |
|-------|-------------|
| Framing version | Present and accepted by both sides under locked topology |
| Required handshake fields | Present, well-typed, accepted — normative list below |
| Fail-closed | Missing field, type mismatch, version mismatch, wrong `profileId`, forbidden channel/bus, or lifecycle IPC outside allowlist → gate **fail**; feature fan-out remains blocked |
| Reproducible | Same Desktop app path can re-run and get the same pass/fail (not a one-off manual claim) |

### Required handshake field list (normative — T004)

Verifier fixture for T004 MUST enumerate exactly:

1. **`framingVersion`** (uint) — framed-pipe protocol generation; both sides must match
2. **`hostProtocolVersion`** — must equal `DESKTOP_HOST_PROTOCOL_VERSION` (= **4** today in `apps/desktop/src/host-protocol.ts`)
3. **`profileId`** — must be `desktop`
4. **`dshExactVersion`** (string) — pinned release dsh version
5. **`clientAssetRevision`** (string) — version-matched client graph/assets
6. **`channels`** — MUST declare `unaryRpc` + `remoteStreams` + `assets` (framed); MUST NOT declare loopback HTTP as the app bus

## Pass / Fail

- **PASS**: Verifier records pass for framing version + handshake fields under locked topology and lifecycle IPC allowlist.
- **FAIL**: Any topology deviation, version/field mismatch, missing required field, forbidden channel/bus, or lifecycle IPC outside the allowlist.

## Non-goals

- Does not prove multi-model chat or mailbox 1:1 (separate contracts).
- Does not authorize MCP, box/shell backends, or alternate transports.
