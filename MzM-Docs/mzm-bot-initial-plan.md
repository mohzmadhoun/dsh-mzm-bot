# Grok Bot Capability Inventory — MzM Bot North-Star Clone

| Field | Value |
|-------|-------|
| **Title** | Grok Bot Capability Inventory (product surface for MzM Bot north star) |
| **Date** | 2026-09-25 |
| **Author audience** | Mohammed Al-Madhoun / DeepSeek Harness — GrokBot project |
| **Doc type** | Exhaustive **product** capability inventory (what Grok Bot can do) |
| **Not this doc** | Spec Kit specify/plan/tasks; implementation HOW; architecture ADR |
| **Primary sources** | `/home/box/reference/app-ui.md`; managed skills under `/home/box/agent-data/managed-skills/skills/*/SKILL.md`; design `docs/designs/mzbot-wedge-to-grok-like.md`; live agent/runtime tool surfaces observed on Grok Bot |
| **Ignored URL** | `https://mzm-bot-plan.md` (500) — not used |

## 0. Doc meta

### Purpose

This document inventories **every major Grok Bot product capability, setting, surface, and job-to-be-done** that Mohammed’s MzM Bot (DeepSeek Harness fork) may eventually need to match for north-star **C** (full Grok-Bot-like product). It is the **cut list** against which later Spec Kit phases decide what belongs in wedge **A** vs later A→C phases.

It deliberately does **not**:

- Specify implementation on DeepSeek Harness / Cordis / Electron.
- Invent UI menus, settings rows, or paths beyond those documented in `app-ui.md`.
- Pretend Grok Bot already has a full multi-model-per-bot product UI (that pain is the MzM **wedge**, not a Grok feature to clone).

### Spec Kit later

Per the project constitution and design doc: **constitution → specify → clarify → plan → tasks → implement** per phase. This inventory is **input to later specify**, not a substitute. Linear issues come from Spec Kit tasks after the tasks step—not from this markdown.

### Relation to A→C (from `mzbot-wedge-to-grok-like.md`)

| Letter | Meaning | Role of this inventory |
|--------|---------|------------------------|
| **A (wedge)** | Per-bot model/provider + basic bot-to-bot messaging + UI good enough to stop Alt-Tab for that workflow | Use this doc to **exclude** most Grok surface from phase 1 |
| **C (north star)** | Full Grok-Bot-comparable multi-bot product on DSH (personas, skills, routines, memory, connectors, easy UI, bot-to-bot) | This doc **defines C’s product checklist** |
| **A→C** | Chosen path: ship A on durable seams that extend to C | Inventory → later Spec Kit phases map rows to phases |

**Short Relation excerpt (design doc):** North star = C. First ship = A on durable DSH seams. Out of wedge: rich personas/anti-jobs, skills library UX, routines/automations, durable memory productization, full connector surface, polished Grok-Bot-identical chrome, etc. Measured daily pain is **model lock**, not missing chrome.

---

## 1. Product definition

**Grok Bot** is a multi-agent desktop product (Cursor-account signed-in) where each **agent** is a persistent persona with its own chat transcript, instructions, tools, skills, routines, memory, connectors, and (shared) computer/box plus optional access to the user’s registered machines.

### What it is (product model)

- **Multi-bot team workspace**: sidebar of agents, optional sections, per-agent chat, parallel work.
- **Computer-using agents**: shared Linux “box” + per-agent desktop/browser; can also act on user machines with approval.
- **Connector-native**: MCP servers / plugins for Linear, GitHub, Gmail, Slack, calendars, etc.
- **Automation-native**: cron and event-driven **routines** that wake agents while the user is away.
- **Skill-native**: managed, user, and plugin skills that gate how agents handle domains (travel, shopping, coding, messaging).
- **Send-on-behalf / draft-first**: messaging and email under the user’s name default to editable draft cards.
- **Subagent orchestration**: specialized workers (executor, computerUse, video, CloudAgent) for long or GUI/video/cloud work.

### What it is not (for inventory honesty)

- Not a single-chat chatbot with one model picker as the whole product.
- Not “Grok the model” alone — Grok Bot is the **agent runtime + desktop app**.
- Not claiming a polished multi-provider model matrix UI (see §16).

### Core value loops

1. **Talk → act → show**: chat produces files, PRs, bookings, digests, messages.
2. **Away work**: routines fire; agent continues on box/connectors; notifies user.
3. **Team of bots**: specialized agents hand off via SendToAgent / channels / CreateAgent.
4. **User remains sovereign**: auto-review, draft-first send, secret-request widgets, machine approvals.

---

## 2. Agents & identity

### Create / update

| Capability | Product surface | Notes |
|------------|-----------------|-------|
| Create agent | `CreateAgent` (runtime) + agents like “dr eggbot” that specialize in designing bots | New agent gets identity, instructions, optional model/harness hints where the platform exposes them |
| Update identity | Agent self-update / `update_state` style identity writes | Name, title, description, avatar shape/color |
| Instructions / persona | Per-agent profile (`profile.json`-class): job, voice, anti-jobs | “One job, explicit anti-jobs” design culture in Grok Bot teams |
| Speak-as-user | `SpeakAsUser` / instruction: when acting in user’s accounts, speak **as** Mohammed, never third person | Product rule for Slack/Gmail/etc. |
| Per-agent settings | Info pane gear: avatar, name, title, description, per-assistant notifications | Distinct from global Settings (`app-ui.md`) |
| Harness / server metadata | Profile fields such as `harness`, `serverId` (observed) | Platform-internal; inventory as “agent runtime binding exists,” not invent UI |

### Sidebar organization

| Capability | How |
|------------|-----|
| Sections | Named sidebar sections grouping `agentIds` (observed in settings: e.g. project sections + “Unassigned”) |
| Collapse | Section `isCollapsed` |
| Delete agent | **Sidebar only**: right-click agent row → **Delete** (permanent; transcript gone; confirm). **Not** in Settings. **No** archive/hide per `app-ui.md` |

### Per-agent info pane (`app-ui.md`)

Open: click agent name in chat header, or **Cmd+Shift+I**. Close: pane **X**.

Contents:

- Live preview of that agent’s computer (click → full screen).
- Routines list for that agent.
- **Channels** when a channel connector is available or connected.
- **Members** in group chats.
- Gear → per-agent Settings subpage (avatar, name, title, description, per-assistant notifications).

### Identity product rules (behavioral)

- Agents have durable transcripts and memory separate from other agents.
- Agents can be specialized (coding, Electron, product owner, travel, email) and run in parallel.
- Creating shareable templates is a skill (`export-bot-template`), not the default create path.

---

## 3. Chat & conversation UX

### SendToUser patterns (primary user-visible channel)

Agents communicate with the user primarily via **SendToUser** (not raw stdout). Patterns include:

| Pattern | Intent |
|---------|--------|
| Progress / status | Short beats while tools run |
| Final answer | Structured result after work |
| File / media | Images, videos, downloadable attachments shown in chat |
| Widgets | Interactive cards (forms, choices, confirmations, drafts) |
| Channel-targeted | Same tool with channel address → Slack/etc. instead of in-app chat |

### Widgets & rich interaction (product)

- **In-chat forms** (`in-chat-forms` skill): structured fields for login/checkout/OTP prefer form widgets; hand off to user/desktop when not fillable.
- **Secret-request**: masked credential capture into secret store (agent never sees value).
- **DraftExternalMessage**: editable send-on-behalf card (email/Slack); user presses Send.
- **Confirm cards**: e.g. routine create/change may require user confirm before save.
- **Cursor cloud agent cards**: in-app only; degrade to HTTPS link on external channels.
- Multiple-choice / numbered options degrade to plain text on channels.

### Markdown / math / media

- Markdown rendering in chat (headings, lists, tables, code).
- Math support expected in assistant markdown (product-quality prose).
- Inline images (including screenshots the agent captures).
- Video / audio handling via specialized subagents (see §11).

### Voice

- **Microphone** setting in General (`app-ui.md` anchor `microphone`).
- **Voice calls** skill: inbound `voice:<call>` addresses; answer/continue call context.
- Voice is a first-class conversation surface alongside typed chat and messaging channels.

### Draft-first messaging culture

Default product behavior for outbound email/Slack under the user’s name: **draft card first**, send only on user confirm—unless explicit opt-out (“just send it”) or standing permission in-thread. See §12 / `send-on-behalf`.

### Group chat rooms

- `[room "…"]` tagged turns (`group-chat-turns` skill).
- Members list in per-agent info pane for group chats.
- Different pacing/voice rules than 1:1 private agent chat.

### Pacing & UX norms (product expectations)

- Acknowledge quickly, then stream progress as separate messages (especially on channels).
- Prefer concise channel replies; richer in-app replies.
- End turns with a clear final user-visible message when a delegated/executor task completes.

---

## 4. Memory

### Layers

| Layer | Scope | Typical contents |
|-------|-------|------------------|
| **Agent memory** | One agent | Job preferences for that persona, project facts, ongoing task state |
| **User memory** | Shared across agents (account) | Profile facts, durable preferences, cross-bot context |
| **Transcript** | Per conversation | Full chat history; not the same as curated memory |

### Memory kinds (product vocabulary)

| Kind | Use |
|------|-----|
| **Profile** | Stable identity facts (timezone, role, preferences) |
| **Log** | Chronological notable events |
| **Note** | Freeform durable notes the agent should keep |

### Recall

- **RecallMemory** (and related runtime recall): agents pull relevant memories into context when needed rather than dumping everything every turn.
- Agents are expected to **write** important durable facts deliberately, not rely on infinite transcript alone.

### Product implications for MzM north star

- Memory UX is part of C (productization of durable memory), **out of wedge A**.
- Distinguish agent-private vs user-global memory early in data model so C does not require rewrite.

---

## 5. Routines

A **routine** = saved prompt (intent) + **trigger** (cron **or** event listener). Created/changed via runtime state updates (`update_state` target `routine`). Shown in the per-agent info pane.

### Cron / schedule

- 5-field cron in **user local timezone** (prompt timezone; Cairo for Mohammed).
- Shorthands: `@hourly` / `@daily` / `@weekly` / `@monthly`, `@every 5m|2h|1d` (min spacing 5 minutes).
- Optional `CRON_TZ=<IANA>` prefix to pin timezone.
- Product guidance: prefer weekday daytime windows; avoid overnight/weekend unless justified; self-expire finite watches.

### Event triggers (inventory)

| Type | What wakes the agent |
|------|----------------------|
| **slack** | Channel/DM/`*`; match mention / keyword / message / reaction (emoji, bySelf) |
| **github** | Repo events: PR open/push/merge/close, reviews, comments, threads, issue-assigned, CI pass/fail; optional `pr`, `userAllowlist`, `ciBranch` |
| **origin** | Native Cursor Origin repo events (not GitHub mirrors); PR babysit pack; CI PR-scoped |
| **microsoftTeams** | Tenant + teamIds; optional channelIds / messageContains |
| **linear** | issueCreated / statusChanged / endOfCycle; optional project/team filters |
| **sentry** | issue created/resolved/assigned/archived/unresolved/any; optional projectIds |
| **pagerduty** | incident triggered/acked/resolved/escalated/any; optional serviceIds |
| **email** | Arrival at a Grok Bot inbox address; optional from / requireAuthPass |
| **webhook** | External POST to routine webhook URL (user copies URL + sender key from panel) |
| **group** | OR of several listeners (with platform grouping constraints) |

### Lifecycle product behaviors

- Confirm card on create/change (acts while user away).
- Pause/resume on recurring auth failures.
- Auto-delete PR babysit routines after terminal merge/close wakes (GitHub/Origin rules).
- Prefer event listeners over polling when the event exists.
- Slack channel listeners require `@Cursor` invited to the channel.

### Delivery

Routine runs use the agent’s tools; communication intent is stored as outcomes (“notify user”), and the runtime picks SendToUser / channel / etc.

---

## 6. Skills

Skills are markdown playbooks (`SKILL.md`) that agents **read before acting** in a domain. Three sources:

| Source | Location / nature | Who owns |
|--------|-------------------|----------|
| **Managed** | `/home/box/agent-data/managed-skills/skills` | Platform-shipped |
| **User** | Per-user authored skills | User + agents (`skill-authoring`) |
| **Plugin** | Plugin-provided (`plugin-skills` cache observed) | Connectors/plugins |

### Managed skills inventory (one-line each)

| Skill | Description |
|-------|-------------|
| `accommodation-booking` | Find/compare/book/change stays or listing costs before opening lodging sites. |
| `add-connector` | Walk through connecting a new MCP connector — search catalog, install, authenticate. |
| `box-desktop` | Before first browser/desktop subagent when task needs own desktop/GUI/sign-in. |
| `channels` | Inbound channel messages/reactions, or connect/disconnect a messaging channel. |
| `code-changes` | Coding work in a repo, or Cursor Origin / `origin` CLI. |
| `export-bot-template` | Create a shareable copy of this bot’s setup. |
| `flight-booking` | Find/compare/book/change/check-in flights or boarding passes before travel sites. |
| `food-ordering` | Order delivery/pickup / handle dinner before opening delivery apps. |
| `group-chat-turns` | Taking a turn in a group chat room (`[room "…"]`), not private chat. |
| `in-chat-forms` | Before typed web login/checkout/OTP steps; prefer forms vs handoff. |
| `job-search` | Find/track/apply to jobs before LinkedIn/job boards. |
| `learn-from-demonstration` | Turn a screen-recorded demonstration into a reusable skill. |
| `no-connector-fallback` | Service has no connector / needs auth / CLI login / browser sign-in wall. |
| `purchases` | Buy/book/order/pay — read before shopping or booking. |
| `restaurant-booking` | Book/reserve tables or check availability before reservation sites. |
| `restaurant-recommendations` | Where/what to eat out — ideas/comparisons before naming places. |
| `rideshare` | Book Uber/Lyft/Bolt/Grab/etc. before opening the service. |
| `routines` | Recurring/scheduled/event-driven work — read before create/change. |
| `scheduling` | Calendar, meetings, availability, appointments — before acting. |
| `send-on-behalf` | Draft/reply/send email or messages as the user on outside platforms. |
| `shopping` | Buy/order/compare products (Amazon/retail) before cart. |
| `site-playbooks-airbnb` | Airbnb: search stays or read one listing (not host tools). |
| `site-playbooks-bestbuy` | Best Buy: search by name; price/stock/pickup for a SKU. |
| `site-playbooks-costco` | Costco.com product price/availability or Same-Day cart. |
| `site-playbooks-craigslist` | Craigslist: search near a city (not posting/replying). |
| `site-playbooks-doordash` | DoorDash: stores, menu, cart, or checkout read-back. |
| `site-playbooks-ebay` | eBay: find, price, or check a product listing. |
| `site-playbooks-etsy` | Etsy: find/price a product (not seller tools). |
| `site-playbooks-expedia` | Expedia: compare flights, hotels, or travel options. |
| `site-playbooks-facebook-marketplace` | FB Marketplace: used items/cars/rentals near you. |
| `site-playbooks-fedex` | FedEx: track a package (not labels/POD/refunds). |
| `site-playbooks-google-flights` | Google Flights: cheapest fares/itineraries on a route. |
| `site-playbooks-instacart` | Instacart: search/add groceries; guest first. |
| `site-playbooks-linkedin` | LinkedIn: job posting search (not apply/profiles/people). |
| `site-playbooks-luma` | Luma: find events or read one event (not host tools). |
| `site-playbooks-realtor` | Realtor.com: home listings or school ratings. |
| `site-playbooks-resy` | Resy: table availability (not sign-in/book/cancel). |
| `site-playbooks-southwest` | Southwest: fares/itineraries (not book/check-in/changes). |
| `site-playbooks-target` | Target: find/price product or store pickup for TCIN. |
| `site-playbooks-united` | United: cash fares or awards (not booked trip/upgrades/check-in). |
| `site-playbooks-ups` | UPS: track a package. |
| `site-playbooks-usps` | USPS: tracking (not pickup/hold mail/Informed Delivery/address change). |
| `skill-authoring` | Save/change/delete a reusable multi-step skill. |
| `source-control` | GitHub / Origin / SCM: repos, PRs, issues, CI; vs cloud agent. |
| `voice-calls` | Inbound voice call addresses, answering, or referring to call content. |

### Skill authoring & teaching

- **skill-authoring**: save reusable multi-step tasks as skills.
- **learn-from-demonstration**: convert a teach/screen recording into a skill.
- Site playbooks: narrow, safe browser recipes for specific sites (complement connectors).

---

## 7. Computer / box

### Shared Linux box

- One persistent Linux machine **shared by all of the user’s agents**.
- Shared filesystem, installed tools, browser logins, `/workspace` scratch.
- **Desktops are per-agent**: each agent has its own screen/browser window; agents do not share desktops.

### Surfaces

| Surface | Role |
|---------|------|
| **Shell** | Commands, installs, file generation; starts in `/workspace` |
| **Read** | Line-numbered text; inline images; PDF via tooling |
| **Browser / desktop** | GUI via computerUse subagent; `box-chrome` launcher |
| **Copy tools** | Move files between box and user machines |
| **box-doctor** | Health check (machine-id, Chrome, DNS, clock, D-Bus) |

### Update / reset (`app-ui.md` — Computer + Updates)

| Action | Anchor | Behavior |
|--------|--------|----------|
| **Update Grok Bot’s Computer** | `update-computer` | Fresh box instance; **keeps files and logins**; **reinstall** apt/npm/pip/CLIs/images; two-click confirm (“Update”) — **preferred recovery** |
| **Reset Grok Bot’s Computer** | `reset-computer` | Restore last saved snapshot; can lose recent unsynced work — **last resort**; product guidance steers users to Update |
| **Update Track / Check for Updates** | `update-channel`, etc. | Updates the **Grok Bot app** (Stable/Nightly), distinct from updating the computer |

### Runtime notes (ops, not invent UI)

- Box may be local Docker (dev) or brokered anyrun pod (default).
- Transient “still starting” during image pull/boot.
- Persistence: files/tools survive turns; Update recreates instance with caveats above.

---

## 8. User machines

| Capability | Detail |
|------------|--------|
| **ListMachines** | Registered machines: `machineId`, label, local-exec connection status |
| **machineId targeting** | Shell / Read / AwaitShell / CopyToBox / CopyFromBox on a chosen machine |
| **Sent-from hint** | Desktop app messages note `[Sent from machine <id>]` for default targeting |
| **CopyToBox** | Pull file from user computer → box (`/workspace/uploads` or chosen path) |
| **CopyFromBox** | Push box file → user computer (working dir or chosen path) |
| **Local-tool approval** | Machine-targeted commands require user’s local-tool approval; settings may store per-machine permission (observed: `localToolPermissionByMachineId`) |
| **Local execution setting** | General settings anchor `local-execution` |

### Product boundary

- Box paths ≠ machine paths; always use copy tools to cross.
- Destructive git ops on machines should confirm with user first (agent policy).

---

## 9. Connectors / MCP / plugins

### Model

- **MCP servers** expose tools; agents discover schemas via **GetMcpTools** / status via server status, then **CallMcpTool**.
- Servers can be `ready`, `needsAuth`, `needsGrant`, `error`, `loading`.
- **AuthenticateMcpServer** / connect cards for re-auth (user completes in UI).
- Custom instructions / disabled tools per server (settings fields observed).
- **add-connector** skill: catalog search → install → authenticate.
- **no-connector-fallback**: browser/CLI paths when no connector.

### Example connector families (non-exhaustive; live catalog varies by account)

| Family | Examples of jobs |
|--------|------------------|
| **Issue trackers** | Linear (issues, projects, cycles, docs, diffs, releases…) |
| **Source control** | GitHub MCP + `gh` CLI; Cursor Origin |
| **Email / calendar** | Gmail draft/send/upload attachments; calendar scheduling skill |
| **Chat** | Slack (and channel product surface); Teams triggers via routines |
| **Cloud / ops** | Sentry, PagerDuty (routine triggers); cloud agents |
| **Drive / files** | Google Drive / OneDrive upload/download patterns |
| **Plugins / marketplaces** | Plugin install surface; plugin skills cache |

### Upload / download file bridges

- `upload_file` / `download_file` style bridges: bytes go service↔box without pasting content into chat (size/type safe).

### Product note for MzM

Full connector surface is **C**, not wedge A. Wedge only needs enough auth/provider wiring for multi-model + basic messaging.

---

## 10. Multi-agent

| Capability | Product meaning |
|------------|-----------------|
| **SendToAgent** | One agent messages another; recipient can act; user can orchestrate |
| **Channels** | Shared messaging surfaces / room addressing beyond 1:1 |
| **CreateAgent** | Spawn new specialized agents from a designer or peer agent |
| **Parallel team** | Many agents in sidebar sections working the same project |
| **Handoffs** | Coding bots ↔ Electron ↔ Spec ↔ Verifier style teams (observed in Mohammed’s DSH project) |
| **Export template** | Share bot setup as template |

Wedge A minimum: **basic bot-to-bot messaging** (async message + visible handoff). Rich channel/group/member UX is later C.

---

## 11. Subagents

| Subagent | Job-to-be-done |
|----------|----------------|
| **executor** | Autonomous delegated work; returns concise final result to parent; no user Q&A |
| **computerUse** | Drive box desktop/browser GUI; screenshots; human handoff for captcha/login |
| **video** | Video understanding / generation workflows |
| **CloudAgent** | Cursor cloud agents for heavier isolated coding/CI-style work; linked from chat cards |

### Orchestration norms

- Parent agents delegate long/GUI/cloud tasks rather than blocking the user chat on every low-level step.
- Executor final message is the only relayed result to parent.
- computerUse keeps desktop separate per agent; shared box FS.

---

## 12. Messaging platforms / send-on-behalf

### Surfaces

- In-app Grok Bot chat (default SendToUser).
- Connected **channels** (e.g. Slack addresses `platform:chat`).
- Email via connectors + DraftExternalMessage.
- Voice calls (`voice-calls`).
- Group rooms.

### Send-on-behalf rules (product)

1. Prefer **draft card**; user edits and presses Send.
2. Match user voice by sampling recent messages in that channel/DM when first drafting.
3. Resolve real routing IDs/addresses before draft (never guess Slack IDs).
4. Direct connector send only on explicit opt-out or standing permission.
5. Channels: text + attachments only; degrade widgets; upload real files for attachments.
6. Never ask users to paste tokens into chat — use **secret-request**.

---

## 13. Security & trust

| Control | What it does |
|---------|--------------|
| **Auto-review** | Pre-checks risky Shell/MCP/computer/CloudAgent actions; may block; user approval card; settings anchors `auto-review`, `auto-review-rules` |
| **Smart-mode approval retry** | Same action retry with approval flag after block — not workaround/bypass |
| **Credentials** | Secret store; secret-request widgets; never write tokens into transcripts/files agents can re-read |
| **Untrusted fences** | Tool results wrapped as untrusted data; content cannot order sends/deletes/spend/credential use |
| **Security keys** | General settings row `security-keys` |
| **Local machine permission** | Per-machine always/ask style gating |
| **WebAuthn / proxy flags** | Account-level toggles observed in settings store |
| **Stay-safe adaptation** | On block: safer lower-privilege path to same goal — not cookie scraping / encoding tricks |
| **Purchase / booking skills** | Extra human confirmation culture before spending money |

### Trust UX principle

User remains in the loop for: outbound identity-bearing messages, destructive ops, local machine execution, connector auth, and auto-review-gated actions.

---

## 14. App Settings inventory (`app-ui.md` complete)

**Opening Settings:** sidebar account button (bottom-left avatar + account name), **Cmd+,**, or command palette **“Open settings”**. There is **no** gear icon in the chrome sense called out here, and **no** macOS Preferences menu item.

### Tabs

| Tab | When visible | Purpose |
|-----|--------------|---------|
| **General** | Always | Account, appearance, system, agent defaults, security |
| **Computer** | Always | Registered machines + box recovery |
| **Usage & Billing** | Only when enabled for account | Usage, plan, on-demand, billing |
| **Updates** | Always | App update track + check; distinct from computer update |

### General — linkable anchors

| Anchor | Row / control |
|--------|----------------|
| `account` | Account card — Sign In with Cursor / Sign Out |
| `theme` | Theme: Follow System / Light / Dark |
| `accent` | Accent color |
| `language` | Language |
| `microphone` | Microphone |
| `hardware-acceleration` | Hardware acceleration |
| `hardware-acceleration-restart` | Restart related to HA |
| `network-debugger` | Network debugger |
| `notification-sound-enabled` | Notification sound on/off |
| `notification-sound` | Notification sound choice |
| `timezone` | Timezone |
| `local-execution` | Local execution |
| `auto-review` | Auto-review |
| `auto-review-rules` | Auto-review rules |
| `security-keys` | Security keys |

General also covers: appearance controls, system controls, agent defaults, security keys (as grouped in `app-ui.md`).

### Computer — anchors

| Anchor | Row |
|--------|-----|
| `computers` | Registered machines list / management |
| `update-computer` | **Update Grok Bot’s Computer** (button “Update”; two-click confirm) |
| `reset-computer` | **Reset Grok Bot’s Computer** (button “Reset”; destructive last resort) |

### Usage & Billing — anchors (account-gated)

| Anchor | Row |
|--------|-----|
| `usage` | Included / usage view |
| `plan` | Plan controls |
| `cancel-trial` | Cancel trial |
| `on-demand` | On-demand usage |
| `billing` | Billing |

### Updates — anchors

| Anchor | Row |
|--------|-----|
| `update-status` | Update status |
| `update-channel` | Update Track: Stable / Nightly |
| `automatic-updates` | Automatic updates |
| `update-computer` | Also listed under Updates map in source (computer update entry point) |
| `reset-computer` | Also listed under Updates map in source |

**Distinction:** “Check for Updates” / update channel update the **app**; Update/Reset Computer recreate or restore the **box**.

### Per-agent settings (not global Settings tabs)

Via info pane gear: avatar, name, title, description, per-assistant notifications.

### Deleting agents (not Settings)

Sidebar right-click → Delete (permanent). No archive/hide.

### Honesty rule

Some rows exist only on some accounts, builds, or states. If a user cannot find a row, say so — **do not invent** alternate menus.

---

## 15. Capability catalog by job-to-be-done + skill map

| Job-to-be-done | Primary skills / surfaces |
|----------------|---------------------------|
| Build a multi-bot team | CreateAgent, sidebar sections, export-bot-template, SendToAgent |
| Ship code / PRs / CI | code-changes, source-control, GitHub MCP, CloudAgent, Origin |
| Track product work | Linear MCP, routines (Linear triggers) |
| Schedule meetings | scheduling (+ calendar connectors) |
| Inbox / RSVP / school forms | email routines, send-on-behalf, DraftExternalMessage |
| Slack ops / mentions | channels, send-on-behalf, Slack routines |
| Morning digest / monitors | routines (cron) |
| Book travel | flight-booking, accommodation-booking, site playbooks (Expedia/Google Flights/airlines) |
| Eat / order food | restaurant-*, food-ordering, DoorDash/Resy playbooks |
| Shop / buy | shopping, purchases, retailer playbooks |
| Get a ride | rideshare |
| Find a job | job-search, LinkedIn playbook |
| Track packages | FedEx/UPS/USPS playbooks |
| Use a site with no API | box-desktop, computerUse, site-playbooks-*, no-connector-fallback |
| Teach a workflow | learn-from-demonstration, skill-authoring |
| Connect a new service | add-connector, AuthenticateMcpServer |
| Act on user’s PC files | ListMachines, CopyTo*, machine Shell/Read |
| Voice conversation | voice-calls, microphone setting |
| Recover broken box | Update Computer (prefer), box-doctor, debugging-the-box |
| Keep secrets safe | secret-request, auto-review, untrusted fences |

---

## 16. Model / provider notes (honest)

| Claim | Reality for inventory |
|-------|------------------------|
| Grok Bot runs capable models | Yes — model(s) power agents |
| Grok Bot is a polished **multi-model-per-bot** product UI | **Do not invent this.** Mohammed’s measured pain is being stuck on one stack and Alt-Tabbing to Cursor/Claude |
| MzM wedge A | Explicitly adds **per-bot model/provider assignment** (GPT / Claude / Grok / DeepSeek as configured) |
| North star C | Grok-like product surface **plus** the multi-model wager MzM is betting on — clone Grok capabilities without pretending Grok already solved multi-model UX |

**Implication:** Section checklists for C include personas/skills/routines/memory/connectors/UI. Multi-model matrix is an **MzM differentiator / wedge**, called out so Spec Kit does not “clone” a nonexistent Grok settings page.

---

## 17. GrokBot-like north star checklist for MzM Bot (C)

Use as a later-phase backlog filter (not phase-1 scope). Mark wedge items separately.

### Agents & identity
- [ ] Create / rename / describe / avatar agents
- [ ] Sidebar sections + collapse
- [ ] Permanent delete with confirm
- [ ] Per-agent info pane (computer preview, routines, channels, members)
- [ ] Per-agent notification settings
- [ ] Speak-as-user on external accounts
- [ ] Anti-jobs / one-job persona culture

### Chat UX
- [ ] SendToUser-quality streaming progress + finals
- [ ] Markdown / math / code / tables
- [ ] Widgets: forms, secrets, confirms, draft cards
- [ ] File / image / video in chat
- [ ] Voice input / calls
- [ ] Group chat rooms + members

### Memory
- [ ] Agent vs user memory
- [ ] Profile / log / note kinds
- [ ] Recall into context

### Routines
- [ ] Cron in user TZ + shorthands
- [ ] Slack / GitHub / Origin / Teams / Linear / Sentry / PagerDuty / email / webhook / group triggers
- [ ] Pause/resume, confirm-on-save, self-expiring watches
- [ ] Routines list in agent pane

### Skills
- [ ] Managed skill pack (or MzM equivalents)
- [ ] User skill authoring
- [ ] Plugin skills
- [ ] Learn-from-demonstration

### Computer
- [ ] Shared persistent Linux box across agents
- [ ] Per-agent desktop/browser
- [ ] Shell + Read + browser automation
- [ ] Update computer (keep files/logins) / Reset last resort
- [ ] App update channel (Stable/Nightly)

### User machines
- [ ] Register machines, machineId routing
- [ ] Copy to/from box
- [ ] Local execution approval UX

### Connectors
- [ ] MCP catalog install/auth
- [ ] Status: needsAuth/needsGrant
- [ ] Major families: GitHub, Linear, Gmail, Slack, Drive, calendar, …

### Multi-agent & subagents
- [ ] SendToAgent
- [ ] CreateAgent from peer/designer
- [ ] executor / computerUse / video / CloudAgent (or DSH equivalents)

### Messaging
- [ ] Draft-first send-on-behalf
- [ ] Channel inbound/outbound addressing
- [ ] Attachment upload to platforms

### Security
- [ ] Auto-review + user approval cards
- [ ] Secret capture widgets
- [ ] Untrusted tool-result fencing
- [ ] Settings: auto-review, security-keys, local-execution

### Settings chrome parity (`app-ui.md`)
- [ ] Open via account button / Cmd+, / palette
- [ ] Tabs: General, Computer, Usage & Billing (gated), Updates
- [ ] All listed anchors implemented or explicitly deferred

### MzM-only (wedge → keep through C)
- [ ] **Per-bot model/provider assignment** (not assumed from Grok)
- [ ] Provider auth UX (keys / 1Password / env / in-app) — open question in design doc

---

## 18. Unknowns / non-goals / never invent

### Unknowns (do not fake answers)

- Exact full connector catalog for every account/build (varies).
- Whether every Usage & Billing row appears for Mohammed’s account.
- Precise multi-model controls inside stock Grok Bot (treat as **unknown / non-feature** for clone purposes).
- Full enumeration of every SendToUser widget type beyond those evidenced in skills/tools.
- Origin vs GitHub feature parity edge cases beyond routines skill.
- Meetings/Messages feature flags observed in settings store (`meetingsEnabled`, `messagesEnabled`) — purpose/UI not in `app-ui.md`; **do not invent menus**.

### Non-goals of this document

- Spec Kit constitution/specify/plan/tasks (separate artifacts).
- Implementation on Cordis plugins / Electron IPC.
- Pixel-perfect chrome clone as phase-1 work.
- Recreating every site playbook on day one of C.
- Using the failed `mzm-bot-plan.md` URL.

### Never invent (hard)

- Settings paths, tabs, or anchors **beyond** `app-ui.md`.
- “Archive agent” / “Hide agent” (explicitly does not exist — only Delete).
- Gear-icon Settings entry or macOS Preferences item.
- Pretend Grok has full multi-model-per-bot UI.
- Token-paste flows; always secret-request / connect cards.

### Sources checklist (this revision)

| Source | Used |
|--------|------|
| `/home/box/reference/app-ui.md` | §14 and UI facts throughout |
| `/home/box/reference/debugging-the-box.md` | §7 recovery/ops |
| Managed skills `SKILL.md` descriptions | §6 table |
| `docs/designs/mzbot-wedge-to-grok-like.md` | §0 Relation; §16–17 wedge vs C |
| Live settings/agent/MCP observations | Cross-checks; labeled as observed where not in app-ui |

---

## Appendix A — Quick glossary

| Term | Meaning |
|------|---------|
| **Agent / bot** | Persistent persona with chat, tools, memory, routines |
| **Box** | Shared Linux computer for agents |
| **Desktop** | Per-agent GUI session on the box |
| **Routine** | Saved prompt + cron or event trigger |
| **Skill** | Domain playbook read before acting |
| **Connector / MCP** | Authenticated tool server |
| **SendToUser** | Primary chat/channel delivery API |
| **Wedge A** | Multi-model per bot + basic bot-to-bot on DSH |
| **North star C** | Full Grok-Bot-like product on DSH |

## Appendix B — Suggested Spec Kit phasing (pointer only)

Not a plan—only a reminder of A→C ordering from design/constitution:

1. **Phase 1 (A):** per-bot models + basic SendToAgent-style messaging + usable Electron UI.
2. **Later:** personas/anti-jobs → skills UX → routines → memory → connectors → settings/chrome polish → subagent parity.

Each phase gets its own specify→plan→tasks; this inventory is the C checklist those phases cherry-pick from.
