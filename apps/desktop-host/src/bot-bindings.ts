/**
 * Host per-bot model/provider binding + isolated agent scopes (US1 T011 / T012).
 *
 * Each bot gets its own `createScope` key and `installModelSelection` routing into
 * Host `ctx.llm` (shared adapter registry; per-bot request binding). Scope-local
 * tools do not grant privilege to sibling bots — chat-only trust floor (no Shell/box/MCP).
 *
 * @module desktop-host/bot-bindings
 */

import { Context, Service } from '@deepseek-ai/cordis'
import { brandString, type Branded } from '@deepseek-ai/dsh-brand'
import {
  installModelSelection,
  type ModelSelection,
  type ModelSelectionRef,
} from '@deepseek-ai/dsh-agent'
import { createScope, scopeOf, type Scope, type ScopeKey } from '@deepseek-ai/dsh-scope'
import type {} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-system-prompt'

/** Opaque bot id within the Desktop profile. */
export type DesktopBotId = Branded<'desktop-bot-id'>

/** Opaque model-binding id within the Desktop profile. */
export type DesktopModelBindingId = Branded<'desktop-model-binding-id'>

/** P1 provider set from `contracts/per-bot-model-binding.md` (as available). */
export const DESKTOP_WEDGE_PROVIDERS = ['gpt', 'claude', 'grok', 'deepseek'] as const

export type DesktopWedgeProvider = (typeof DESKTOP_WEDGE_PROVIDERS)[number]

/** Model/provider assignment owned by one bot (data-model ModelBinding). */
export interface DesktopModelBinding {
  readonly id: DesktopModelBindingId
  readonly botId: DesktopBotId
  readonly provider: DesktopWedgeProvider
  readonly modelId: string
  /** Credential reference only — never raw secret material. */
  readonly credentialRef?: string
}

/** Bot lifecycle status for the wedge create path. */
export type DesktopBotStatus = 'draft' | 'ready' | 'error'

/** Host-visible bot record (data-model Bot, Host plane). */
export interface DesktopBotRecord {
  readonly id: DesktopBotId
  readonly displayName: string
  readonly modelBindingId: DesktopModelBindingId | undefined
  readonly status: DesktopBotStatus
  /** Opaque scope key for tools / events (the bot record itself). */
  readonly scopeKey: ScopeKey
}

/** Options to create a usable multi-model bot (binding required). */
export interface CreateDesktopBotOptions {
  readonly displayName: string
  readonly provider: DesktopWedgeProvider
  readonly modelId: string
  readonly credentialRef?: string
}

/** Options to create an incomplete draft (not usable until binding assigned). */
export interface CreateDesktopBotDraftOptions {
  readonly displayName: string
}

declare module '@deepseek-ai/cordis' {
  interface Context {
    /** Host per-bot model bindings + isolated scopes for the Desktop wedge. */
    desktopBotBindings: DesktopBotBindings
  }
}

function isWedgeProvider(value: string): value is DesktopWedgeProvider {
  return (DESKTOP_WEDGE_PROVIDERS as readonly string[]).includes(value)
}

function requireDisplayName(displayName: string): string {
  const trimmed = displayName.trim()
  if (trimmed.length === 0) {
    throw new Error('desktop bot: displayName is required')
  }
  return trimmed
}

function requireModelBindingFields(provider: string, modelId: string): {
  provider: DesktopWedgeProvider
  modelId: string
} {
  if (!isWedgeProvider(provider)) {
    throw new Error(
      `desktop bot: provider must be one of ${DESKTOP_WEDGE_PROVIDERS.join(' / ')} (got ${JSON.stringify(provider)})`,
    )
  }
  const trimmedModel = modelId.trim()
  if (trimmedModel.length === 0) {
    throw new Error('desktop bot: modelId is required for a usable multi-model bot')
  }
  return { provider, modelId: trimmedModel }
}

interface LiveBot {
  record: DesktopBotRecord
  readonly scope: Scope
  binding: DesktopModelBinding | undefined
  readonly selection: ModelSelectionRef
  disposeSelection: () => void
}

/**
 * Host service: per-bot model/provider binding via isolate (createScope) +
 * `installModelSelection` into Host `ctx.llm` request routing.
 */
export class DesktopBotBindings extends Service {
  static readonly inject = ['tools', 'systemPrompt']

  private readonly bots = new Map<DesktopBotId, LiveBot>()
  private seq = 0

  constructor(ctx: Context) {
    super(ctx, 'desktopBotBindings')
    ctx.effect(() => () => {
      for (const live of this.bots.values()) {
        live.disposeSelection()
        void live.scope.dispose()
      }
      this.bots.clear()
    })
  }

  private nextId(kind: 'bot' | 'binding'): string {
    this.seq += 1
    return `desktop-${kind}-${String(this.seq)}`
  }

  /**
   * Create a usable bot with a required model/provider binding and an isolated scope.
   * @param options - Display name plus provider/model assignment.
   * @returns The ready bot record.
   */
  async createBot(options: CreateDesktopBotOptions): Promise<DesktopBotRecord> {
    const displayName = requireDisplayName(options.displayName)
    const { provider, modelId } = requireModelBindingFields(options.provider, options.modelId)
    const botId = brandString<DesktopBotId>(this.nextId('bot'))
    const bindingId = brandString<DesktopModelBindingId>(this.nextId('binding'))
    const binding: DesktopModelBinding = {
      id: bindingId,
      botId,
      provider,
      modelId,
      ...(options.credentialRef === undefined ? {} : { credentialRef: options.credentialRef }),
    }
    const record: DesktopBotRecord = {
      id: botId,
      displayName,
      modelBindingId: bindingId,
      status: 'ready',
      scopeKey: { botId },
    }
    return this.mountBot(record, binding)
  }

  /**
   * Create a draft bot without a model binding (not a usable multi-model participant).
   * @param options - Display name only.
   * @returns The draft bot record.
   */
  async createDraft(options: CreateDesktopBotDraftOptions): Promise<DesktopBotRecord> {
    const displayName = requireDisplayName(options.displayName)
    const botId = brandString<DesktopBotId>(this.nextId('bot'))
    const record: DesktopBotRecord = {
      id: botId,
      displayName,
      modelBindingId: undefined,
      status: 'draft',
      scopeKey: { botId },
    }
    return this.mountBot(record, undefined)
  }

  /**
   * Assign or replace the model/provider binding for a bot (promotes draft → ready).
   * @param botId - Existing bot id.
   * @param provider - Wedge provider.
   * @param modelId - Provider-owned model id.
   * @param credentialRef - Optional credential reference (not a secret).
   * @returns The updated ready bot record.
   */
  assignBinding(
    botId: DesktopBotId,
    provider: DesktopWedgeProvider,
    modelId: string,
    credentialRef?: string,
  ): DesktopBotRecord {
    const live = this.requireLive(botId)
    const fields = requireModelBindingFields(provider, modelId)
    const bindingId = brandString<DesktopModelBindingId>(this.nextId('binding'))
    const binding: DesktopModelBinding = {
      id: bindingId,
      botId,
      provider: fields.provider,
      modelId: fields.modelId,
      ...(credentialRef === undefined ? {} : { credentialRef }),
    }
    live.binding = binding
    live.selection.current = this.toSelection(binding)
    live.selection.assembled = undefined
    live.record = {
      id: live.record.id,
      displayName: live.record.displayName,
      modelBindingId: bindingId,
      status: 'ready',
      scopeKey: live.record.scopeKey,
    }
    return live.record
  }

  /**
   * Whether the bot is a usable multi-model participant (binding assigned).
   * @param botId - Bot id.
   * @returns True only when status is ready and a binding exists.
   */
  isUsable(botId: DesktopBotId): boolean {
    const live = this.bots.get(botId)
    return live !== undefined && live.record.status === 'ready' && live.binding !== undefined
  }

  /**
   * Read the model/provider binding for a bot.
   * @param botId - Bot id.
   * @returns Binding, or undefined for drafts without assignment.
   */
  bindingFor(botId: DesktopBotId): DesktopModelBinding | undefined {
    return this.requireLive(botId).binding
  }

  /**
   * Read the Host bot record.
   * @param botId - Bot id.
   * @returns Bot record.
   */
  bot(botId: DesktopBotId): DesktopBotRecord {
    return this.requireLive(botId).record
  }

  /**
   * List all Host bot records in creation order.
   * @returns Bot records.
   */
  listBots(): DesktopBotRecord[] {
    return [...this.bots.values()].map(live => live.record)
  }

  /**
   * Scoped Cordis context for the bot (isolate plane for tools + model selection).
   * @param botId - Bot id.
   * @returns Scoped context whose `scopeOf` is the bot's scope key.
   */
  scopeCtx(botId: DesktopBotId): Context {
    return this.requireLive(botId).scope.ctx
  }

  /**
   * Opaque scope key used by the tools registry for privilege isolation.
   * @param botId - Bot id.
   * @returns Scope key.
   */
  scopeKey(botId: DesktopBotId): ScopeKey {
    return this.requireLive(botId).record.scopeKey
  }

  /**
   * Current model selection intended for the next Host `ctx.llm` request via this bot.
   * @param botId - Bot id.
   * @returns Selection, or undefined when the bot is not yet bound.
   */
  modelSelection(botId: DesktopBotId): ModelSelection | undefined {
    return this.requireLive(botId).selection.current
  }

  /**
   * Snapshot prompt-assembly variables for this bot (provider/model from binding).
   * @param botId - Bot id.
   * @returns Assembled system-prompt variables including provider/model when bound.
   */
  async assemblePromptVariables(botId: DesktopBotId): Promise<Record<string, unknown>> {
    const live = this.requireLive(botId)
    // Pass the bot isolate scope so scoped installModelSelection listeners receive the waterfall.
    const assembled = await live.scope.ctx.systemPrompt.assemble({ scope: live.record.scopeKey })
    return assembled.variables as Record<string, unknown>
  }

  private toSelection(binding: DesktopModelBinding): ModelSelection {
    return { provider: binding.provider, model: binding.modelId }
  }

  private requireLive(botId: DesktopBotId): LiveBot {
    const live = this.bots.get(botId)
    if (live === undefined) {
      throw new Error(`desktop bot: unknown bot ${botId}`)
    }
    return live
  }

  private async mountBot(
    record: DesktopBotRecord,
    binding: DesktopModelBinding | undefined,
  ): Promise<DesktopBotRecord> {
    const selection: ModelSelectionRef = {
      current: binding === undefined ? undefined : this.toSelection(binding),
      assembled: undefined,
    }
    let scope!: Scope
    await this.ctx.plugin(Object.assign((inner: Context) => {
      scope = createScope(inner, record.scopeKey)
      // Fail loud if the minting chain lost tools/systemPrompt (chat-only Host must provide both).
      if (scope.ctx.get('tools') === undefined || scope.ctx.get('systemPrompt') === undefined) {
        throw new Error('desktop bot: scoped context missing tools or systemPrompt')
      }
    }, { inject: ['tools', 'systemPrompt'] as const }))
    if (scopeOf(scope.ctx) !== record.scopeKey) {
      throw new Error('desktop bot: scope tag mismatch after createScope')
    }
    const disposeSelection = installModelSelection(scope.ctx, selection)
    this.bots.set(record.id, { record, scope, binding, selection, disposeSelection })
    return record
  }
}

export default DesktopBotBindings
