# Contract: Host mailbox — async bot→bot 1:1

**Feature**: `001-p1-wedge-multi-model`  
**Owns acceptance**: DH Verifier (+ Runtime implementation)  
**Related**: FR-005, SC-002, User Story 2

## Purpose

Define the only allowed async 1:1 bot→bot delivery path for P1.

## Interface rules

| Rule | Requirement |
|------|-------------|
| Path | Delivery MUST use Host mailbox/inbox only |
| Cardinality | Exactly one sender bot and one recipient bot per message (1:1) |
| Async | Sender MUST NOT require recipient to be actively running for the send to be accepted into the mailbox |
| Outcome | Recipient acts **or** handoff is user-visible (pending/undelivered/acted) |
| No silent drop | Offline/unavailable recipient → pending or failed-visible state |
| No parallel bus | Product MUST NOT provide an Electron-side messaging bus for this flow |

## Observable acceptance

Given two bots in the same Desktop profile, when A sends 1:1 to B via Host mailbox, then either B acts or Mohammed can see the handoff state — without copy-paste between apps.

## Non-goals

- Group channels, broadcast, send-on-behalf, cross-profile mail
