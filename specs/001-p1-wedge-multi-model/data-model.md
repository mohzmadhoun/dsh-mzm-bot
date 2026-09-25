# Data Model: Phase 1 Wedge A

**Branch**: `001-p1-wedge-multi-model` | **Date**: 2026-09-25  
**Spec entities**: Bot, Model/provider binding, Chat session, Host mailbox message, Desktop profile, Framing handshake, Credential

## Entities

### Bot (agent)

| Field | Rules |
|-------|--------|
| `id` | Stable unique id within Desktop profile |
| `displayName` | User-visible name; required for create |
| `modelBindingId` | Required for usable multi-model bot; create incomplete without binding |
| `scopeId` | Isolated agent scope; MUST NOT share tool privilege with other bots |
| `status` | `draft` \| `ready` \| `error` (e.g., missing/revoked credential) |

**Relationships**: 1 Bot → 1 ModelBinding (P1); Bot participates in ChatSession turns; Bot may send/receive MailboxMessage.

**Validation**: Usable bot requires assigned model/provider (FR-007 / edge case).

### ModelBinding

| Field | Rules |
|-------|--------|
| `id` | Unique within profile |
| `botId` | Owning bot |
| `provider` | One of configured set: `gpt` \| `claude` \| `grok` \| `deepseek` (as available) |
| `modelId` | Provider-specific model identifier |
| `credentialRef` | Reference to in-app Credential (not raw secret) |

**Relationships**: Bound via Host isolate / `ctx.llm` for that bot’s turns.

### ChatSession

| Field | Rules |
|-------|--------|
| `id` | Unique session id |
| `profileId` | Desktop profile |
| `participantBotIds` | ≥1; multi-model session uses ≥2 distinct bindings across bots |
| `progressState` | User-visible progress updates during run |
| `finalResult` | Delivered when session completes |
| `createdAt` / `updatedAt` | Timestamps |

**Invariants**: Session MUST NOT store or dump provider secrets (FR-006 / FR-009).

### MailboxMessage (Host inbox)

| Field | Rules |
|-------|--------|
| `id` | Unique message id |
| `fromBotId` | Sender bot |
| `toBotId` | Recipient bot (1:1 only in P1) |
| `body` | Opaque handoff payload (text/structured as Host allows) |
| `state` | `pending` \| `delivered` \| `acted` \| `failed` / undelivered-visible |
| `createdAt` | Send time |
| `visibility` | Handoff MUST be user-visible if recipient has not acted |

**Invariants**: Delivery path = Host mailbox/inbox **only** (FR-005). No Electron parallel bus. Offline recipient → pending/visible, not silent drop.

### DesktopProfile

| Field | Rules |
|-------|--------|
| `path` | `$DSH_HOME/profiles/desktop` |
| `hostInstance` | Single Desktop Host for P1 wedge |

### FramingHandshake (entry gate B)

| Field | Rules |
|-------|--------|
| `framingVersion` | Accepted version under locked topology |
| `handshakeFields` | Required fields set (Verifier-enumerated in contract) |
| `topologyProof` | Evidence of bundled-Node child + framed pipes + IPC lifecycle-only + `dsh-app://` |
| `gateResult` | `pass` \| `fail` (fail-closed) |

**Lifecycle**: Startup handshake → Verifier acceptance → unlocks feature fan-out when `pass`.

### Credential (in-app)

| Field | Rules |
|-------|--------|
| `id` / `ref` | Stable reference used by ModelBinding |
| `provider` | Provider this secret serves |
| `storage` | OS secure store / Host credential seam |
| `presence` | Available \| missing \| revoked |

**Invariants**: Secret material never in ChatSession dumps; renderer must not be primary secret holder.

## State transitions

### Bot
`draft` (created, no binding) → `ready` (binding + usable credential) → `error` (missing/revoked cred) → `ready` (cred restored)

### MailboxMessage
`pending` → `delivered` → `acted`  
`pending` → visible undelivered/failed (user-visible; no silent drop)

### FramingHandshake
`unchecked` → `pass` | `fail` (fail blocks fan-out)

## Scale assumptions

- Single user, one Desktop profile
- ≥2 bots for acceptance
- Message volume: interactive founder use (not high-throughput bus)
