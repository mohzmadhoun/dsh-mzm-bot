# Contract: In-app provider credentials

**Feature**: `001-p1-wedge-multi-model`  
**Owns acceptance**: DH Verifier (+ Electron main / Host credential seam)  
**Related**: FR-006, FR-009, User Story 1

## Purpose

Primary credential path for provider secrets is in-app; sessions are not credential dumps.

## Interface rules

| Rule | Requirement |
|------|-------------|
| Primary path | Electron main → OS secure store / Host credential seam |
| Dev/CI only | Environment variables and key files allowed for development/CI, **not** primary user path |
| Secret hygiene | Secrets MUST NOT appear in chat/session dumps |
| Mid-session failure | Missing/revoked credential → clear failure for that bot’s model use; other bots with valid credentials remain usable |
| Trust floor | Tools MUST NOT send/post externally; MCP MUST NOT be enabled in P1 |

## Observable acceptance

With in-app credentials configured, a bot uses its assigned model without requiring env/key files as the primary path; session artifacts inspected for acceptance do not contain raw secrets.

## Non-goals

- 1Password / connector vault (P6)
- Renderer-held long-lived raw secrets as primary store
