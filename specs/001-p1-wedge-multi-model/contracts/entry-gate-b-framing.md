# Contract: Entry gate B — Shell↔Host framing handshake

**Feature**: `001-p1-wedge-multi-model`  
**Owns acceptance**: DH Verifier  
**Related**: FR-001, FR-002, SC-005, User Story 3

## Purpose

Prove the single allowed Shell↔Host topology and that framing version + required handshake fields are accepted before Electron/Runtime P1 feature fan-out.

## Topology lock (MUST)

Verifier MUST observe exactly:

1. Bundled-Node **Desktop Host child** (spawned by Electron Desktop)
2. **Framed pipes** carry framed traffic
3. **Node IPC** used for **lifecycle-only** signals (not framed chat/rpc bus substitute)
4. App protocol **`dsh-app://`**

Any alternate topology is out of scope and MUST fail this gate.

## Handshake acceptance

| Check | Requirement |
|-------|-------------|
| Framing version | Present and accepted by both sides under locked topology (`framingVersion`, uint) |
| Required handshake fields | Present, well-typed, accepted — **required set** (Architect freeze 2026-09-25; fills T004 placeholders): |
| | • `framingVersion` (uint) |
| | • `hostProtocolVersion` (= `DESKTOP_HOST_PROTOCOL_VERSION`, currently **4**) |
| | • `profileId` = `desktop` |
| | • `dshExactVersion` |
| | • `clientAssetRevision` |
| | • `channels` MUST include `unaryRpc` + `remoteStreams` + `assets`; MUST NOT use loopback HTTP as app bus |
| Fail-closed | Version mismatch, missing required field, wrong `profileId`, or forbidden channel/bus → gate **fail**; feature fan-out remains blocked |
| Reproducible | Same Desktop app path can re-run and get the same pass/fail (not a one-off manual claim) |

### Required handshake field list (normative)

Verifier fixture for T004 MUST enumerate exactly:

1. `framingVersion` (uint)
2. `hostProtocolVersion` (= `DESKTOP_HOST_PROTOCOL_VERSION`, currently 4)
3. `profileId` = `desktop`
4. `dshExactVersion`
5. `clientAssetRevision`
6. `channels` includes `unaryRpc` + `remoteStreams` + `assets`; must **not** use loopback HTTP as the app bus

## Pass / Fail

- **PASS**: Verifier records pass for framing version + handshake fields under locked topology.
- **FAIL**: Any topology deviation, version mismatch, or missing required field.

## Non-goals

- Does not prove multi-model chat or mailbox 1:1 (separate contracts).
- Does not authorize MCP, box/shell backends, or alternate transports.
