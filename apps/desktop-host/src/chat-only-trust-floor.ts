/**
 * P1 chat-only Host composition + trust floor (US1 T016 / T017, MOH-18 / MOH-20).
 *
 * FR-003: sessions + llm adapters + tools registry without local shell/box backends;
 * MCP off. FR-009: tools MUST NOT send/post externally; sessions MUST NOT dump secrets.
 *
 * Enforcement seams (not theater):
 * - Required Cordis services asserted present (`tools`, `llm`, `sessions`).
 * - Forbidden backends (`shell`, `mcpResources`) asserted absent under strict mode /
 *   reported as composition violations otherwise (T018 clears profile rows).
 * - Global `tools.guard` deny for external send/post tool names (incl. MCP / shell / web).
 * - Session-surface sanitizer strips secret-shaped fields while keeping `credentialRef`.
 *
 * @module desktop-host/chat-only-trust-floor
 */

import { Context, Service } from '@deepseek-ai/cordis'
import type { DesktopModelBinding } from './bot-bindings.ts'
import type {} from '@deepseek-ai/dsh-tools'

/** Cordis services the P1 Desktop Host MUST expose for chat-only composition. */
export const CHAT_ONLY_REQUIRED_SERVICES = ['tools', 'llm', 'sessions'] as const

/** Cordis services that mean local shell/box or MCP backends are still mounted. */
export const CHAT_ONLY_FORBIDDEN_SERVICES = ['shell', 'mcpResources'] as const

/**
 * Desktop / base-bundle profile row ids that must be disabled for chat-only P1
 * (export for T018 profile wiring). Names mirror `packages/bundle/base/cordis.patch.yml`.
 */
export const CHAT_ONLY_FORBIDDEN_PROFILE_IDS = [
  'bash-sandbox',
  'pwsh-sandbox',
  'tool-bash',
  'tool-pwsh',
  'web',
  'web-search-deepseek',
  'web-fetch-http',
  'tool-web',
  'mcp-resources',
] as const

/** Exact tool names that perform external send/post or local shell execution. */
export const EXTERNAL_SEND_POST_TOOL_NAMES = new Set([
  'web_fetch',
  'web_search',
  'bash',
  'pwsh',
  'list_mcp_resources',
  'list_mcp_resource_templates',
  'read_mcp_resource',
])

/** Secret-shaped object keys stripped from session / Host surfaces (credentialRef kept). */
const SECRET_SURFACE_KEYS = new Set([
  'apikey',
  'api_key',
  'api-key',
  'secret',
  'password',
  'token',
  'accesstoken',
  'access_token',
  'refreshtoken',
  'refresh_token',
  'privatekey',
  'private_key',
  'authorization',
  'credentials',
  'rawsecret',
  'secretvalue',
  'secret_value',
])

export type ChatOnlyRequiredService = (typeof CHAT_ONLY_REQUIRED_SERVICES)[number]
export type ChatOnlyForbiddenService = (typeof CHAT_ONLY_FORBIDDEN_SERVICES)[number]

/** One composed Cordis profile row (loader / composeEntries shape). */
export interface ChatOnlyProfileRow {
  readonly id?: string
  readonly name?: string
  readonly disabled?: unknown
}

/** Result of auditing a composed profile against chat-only rules. */
export interface ChatOnlyProfileAudit {
  readonly ok: boolean
  /** Active (not disabled) forbidden row ids. */
  readonly activeForbiddenIds: string[]
}

/** Live Host composition status after the trust-floor plugin mounts. */
export interface ChatOnlyCompositionStatus {
  readonly requiredPresent: readonly ChatOnlyRequiredService[]
  readonly requiredMissing: readonly ChatOnlyRequiredService[]
  readonly forbiddenPresent: readonly ChatOnlyForbiddenService[]
  /** True only when required services are present and forbidden backends are absent. */
  readonly chatOnly: boolean
  /** MCP capability gate is closed (tools denied) regardless of leftover profile rows. */
  readonly mcpCapabilityOff: true
}

/** Plugin config. */
export interface DesktopChatOnlyTrustFloorConfig {
  /**
   * When true, throw if `shell` / `mcpResources` are mounted (Verifier chat-only
   * mounts). Host boot keeps this false until T018 disables those profile rows;
   * the tools guard still deny-closes external send/post.
   */
  strictBackends?: boolean
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    desktopChatOnlyTrustFloor: DesktopChatOnlyTrustFloor
  }
}

/**
 * Whether a tool name is an external send/post or local shell/MCP capability.
 * @param name - Tool registry name.
 * @returns True when P1 trust floor must deny execution.
 */
export function isExternalSendPostTool(name: string): boolean {
  return EXTERNAL_SEND_POST_TOOL_NAMES.has(name) || name.startsWith('mcp__')
}

/**
 * Cordis patch rows that disable forbidden chat-only backends (for T018 wiring).
 * @returns Patch entries with `disabled: true`.
 */
export function desktopChatOnlyProfilePatch(): ReadonlyArray<{ id: string; disabled: true }> {
  return CHAT_ONLY_FORBIDDEN_PROFILE_IDS.map(id => ({ id, disabled: true as const }))
}

/**
 * Audit composed profile rows for chat-only (FR-003 / FR-009).
 * @param rows - Entries from composeEntries / profile layers.
 * @returns Audit with active forbidden ids.
 */
export function auditChatOnlyProfileRows(rows: readonly ChatOnlyProfileRow[]): ChatOnlyProfileAudit {
  const forbidden = new Set<string>(CHAT_ONLY_FORBIDDEN_PROFILE_IDS)
  const activeForbiddenIds: string[] = []
  for (const row of rows) {
    if (row.id === undefined || !forbidden.has(row.id)) continue
    if (row.disabled === true) continue
    // Cordis `disabled: !!js ...` expressions are not boolean true at compose time;
    // treat any non-true disabled as still active for this static audit.
    activeForbiddenIds.push(row.id)
  }
  activeForbiddenIds.sort()
  return { ok: activeForbiddenIds.length === 0, activeForbiddenIds }
}

function missingServices(ctx: Context, names: readonly string[]): string[] {
  return names.filter(name => ctx.get(name) === undefined)
}

function presentServices(ctx: Context, names: readonly string[]): string[] {
  return names.filter(name => ctx.get(name) !== undefined)
}

/**
 * Assert chat-only required services are mounted.
 * @param ctx - Cordis context.
 */
export function assertChatOnlyRequiredServices(ctx: Context): void {
  const missing = missingServices(ctx, CHAT_ONLY_REQUIRED_SERVICES)
  if (missing.length > 0) {
    throw new Error(
      `desktop chat-only Host: missing required service${missing.length > 1 ? 's' : ''} ${missing.join(', ')}`,
    )
  }
}

/**
 * Assert local shell/box and MCP backends are absent.
 * @param ctx - Cordis context.
 */
export function assertChatOnlyForbiddenBackendsAbsent(ctx: Context): void {
  const present = presentServices(ctx, CHAT_ONLY_FORBIDDEN_SERVICES)
  if (present.length > 0) {
    throw new Error(
      `desktop chat-only Host: forbidden backend${present.length > 1 ? 's' : ''} present (${present.join(', ')}); shell/box and MCP must be off for P1`,
    )
  }
}

/**
 * Fail-closed chat-only composition check (required present + forbidden absent).
 * @param ctx - Cordis context.
 */
export function assertChatOnlyHostComposition(ctx: Context): void {
  assertChatOnlyRequiredServices(ctx)
  assertChatOnlyForbiddenBackendsAbsent(ctx)
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isSecretSurfaceKey(key: string): boolean {
  if (key === 'credentialRef') return false
  return SECRET_SURFACE_KEYS.has(key.toLowerCase())
}

/**
 * Deep-sanitize a session / Host surface so credential material is not dumped.
 * Keeps `credentialRef` (reference only). Strips secret-shaped keys.
 * @param value - Arbitrary session-facing value.
 * @returns Sanitized clone (primitives unchanged).
 */
export function sanitizeSessionSurface<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(item => sanitizeSessionSurface(item)) as T
  }
  if (!isPlainObject(value)) return value
  const out: Record<string, unknown> = {}
  for (const [key, child] of Object.entries(value)) {
    if (isSecretSurfaceKey(key)) continue
    out[key] = sanitizeSessionSurface(child)
  }
  return out as T
}

/**
 * Session-safe projection of a per-bot model binding (never raw secrets).
 * @param binding - Host model binding.
 * @returns Binding fields safe to place on a session surface.
 */
export function sessionSafeModelBinding(binding: DesktopModelBinding): {
  id: DesktopModelBinding['id']
  botId: DesktopModelBinding['botId']
  provider: DesktopModelBinding['provider']
  modelId: string
  credentialRef?: string
} {
  return sanitizeSessionSurface({
    id: binding.id,
    botId: binding.botId,
    provider: binding.provider,
    modelId: binding.modelId,
    ...(binding.credentialRef === undefined ? {} : { credentialRef: binding.credentialRef }),
  })
}

/**
 * Host service: chat-only composition assert + external-tool deny + session sanitize.
 */
export class DesktopChatOnlyTrustFloor extends Service {
  static readonly inject = ['tools']
  private readonly strictBackends: boolean

  constructor(ctx: Context, config: DesktopChatOnlyTrustFloorConfig = {}) {
    super(ctx, 'desktopChatOnlyTrustFloor')
    this.strictBackends = config.strictBackends === true
    assertChatOnlyRequiredServices(ctx)
    if (this.strictBackends) {
      assertChatOnlyForbiddenBackendsAbsent(ctx)
    }
    // Monotonic capability gate: external send/post + shell + MCP tools cannot run.
    ctx.tools.guard((exec) => {
      if (!isExternalSendPostTool(exec.name)) return undefined
      return `P1 trust floor: tool "${exec.name}" cannot send/post externally (FR-009); MCP and local shell/box are disabled`
    })
  }

  /**
   * Live composition status for Verifier / diagnostics.
   * @returns Required/forbidden service presence and chat-only flag.
   */
  compositionStatus(): ChatOnlyCompositionStatus {
    const requiredMissing = missingServices(this.ctx, CHAT_ONLY_REQUIRED_SERVICES) as ChatOnlyRequiredService[]
    const requiredPresent = CHAT_ONLY_REQUIRED_SERVICES.filter(
      name => !requiredMissing.includes(name),
    )
    const forbiddenPresent = presentServices(
      this.ctx,
      CHAT_ONLY_FORBIDDEN_SERVICES,
    ) as ChatOnlyForbiddenService[]
    return {
      requiredPresent,
      requiredMissing,
      forbiddenPresent,
      chatOnly: requiredMissing.length === 0 && forbiddenPresent.length === 0,
      mcpCapabilityOff: true,
    }
  }

  /**
   * Whether an execute would be denied by the trust floor (name check only).
   * @param toolName - Tool name.
   * @returns True when the guard would deny.
   */
  wouldDenyTool(toolName: string): boolean {
    return isExternalSendPostTool(toolName)
  }

  /**
   * Sanitize a value before it may appear on a session / Host surface.
   * @param value - Candidate surface payload.
   * @returns Sanitized clone.
   */
  sanitizeForSession<T>(value: T): T {
    return sanitizeSessionSurface(value)
  }
}

export default DesktopChatOnlyTrustFloor
