/**
 * Verifier-shaped units for US1 T011 (per-bot ctx.llm binding) + T012 (scope isolation).
 * Contract: specs/001-p1-wedge-multi-model/contracts/per-bot-model-binding.md
 */

import { describe, expect, it } from 'vitest'
import { Context } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import type { Agent } from '@deepseek-ai/dsh-agent'
import { scopeOf } from '@deepseek-ai/dsh-scope'
import DesktopBotBindings, {
  DESKTOP_WEDGE_PROVIDERS,
  type DesktopBotId,
} from '../src/bot-bindings.ts'

const signal = new AbortController().signal

async function mountHost(): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt, {})
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(DesktopBotBindings)
  return ctx
}

function privilegeTool(name: string, reply: string): ToolDefinition {
  return {
    name,
    description: `bot-local privilege ${name}`,
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value as string }],
    },
    execute: (): Promise<string> => Promise.resolve(reply),
  }
}

async function runTool(ctx: Context, name: string, scopeKey: object): Promise<string> {
  // Tools registry keys privilege by object identity of exec.agent (ScopeKey).
  const result = await ctx.tools.execute({
    signal,
    callId: ToolCallId('bot-bindings-probe'),
    name,
    arguments: {},
    agent: scopeKey as Agent,
  })
  const first = result.content[0]
  return first?.type === 'text' ? first.text : JSON.stringify(result.content)
}

describe('T011 / MOH-16 per-bot model/provider binding via isolate + ctx.llm routing', () => {
  it('requires model/provider for a usable bot and accepts the wedge provider set', async () => {
    const ctx = await mountHost()
    const gpt = await ctx.desktopBotBindings.createBot({
      displayName: 'Alpha',
      provider: 'gpt',
      modelId: 'gpt-4.1',
    })
    const claude = await ctx.desktopBotBindings.createBot({
      displayName: 'Beta',
      provider: 'claude',
      modelId: 'claude-sonnet',
    })
    expect(ctx.desktopBotBindings.isUsable(gpt.id)).toBe(true)
    expect(ctx.desktopBotBindings.isUsable(claude.id)).toBe(true)
    expect(ctx.desktopBotBindings.bindingFor(gpt.id)).toMatchObject({
      provider: 'gpt',
      modelId: 'gpt-4.1',
      botId: gpt.id,
    })
    expect(ctx.desktopBotBindings.bindingFor(claude.id)).toMatchObject({
      provider: 'claude',
      modelId: 'claude-sonnet',
      botId: claude.id,
    })
    expect(DESKTOP_WEDGE_PROVIDERS).toEqual(['gpt', 'claude', 'grok', 'deepseek'])
    await expect(ctx.desktopBotBindings.createBot({
      displayName: 'NoModel',
      provider: 'gpt',
      modelId: '   ',
    })).rejects.toThrow(/modelId is required/)
    await expect(ctx.desktopBotBindings.createBot({
      displayName: 'BadProvider',
      provider: 'acme' as 'gpt',
      modelId: 'x',
    })).rejects.toThrow(/provider must be one of/)
  })

  it('drafts without binding are not usable until assignBinding', async () => {
    const ctx = await mountHost()
    const draft = await ctx.desktopBotBindings.createDraft({ displayName: 'Drafty' })
    expect(draft.status).toBe('draft')
    expect(draft.modelBindingId).toBeUndefined()
    expect(ctx.desktopBotBindings.isUsable(draft.id)).toBe(false)
    expect(ctx.desktopBotBindings.modelSelection(draft.id)).toBeUndefined()
    const ready = ctx.desktopBotBindings.assignBinding(draft.id, 'grok', 'grok-4')
    expect(ready.status).toBe('ready')
    expect(ctx.desktopBotBindings.isUsable(draft.id)).toBe(true)
    expect(ctx.desktopBotBindings.modelSelection(draft.id)).toEqual({
      provider: 'grok',
      model: 'grok-4',
    })
  })

  it('isolates model selection per bot into Host llm request routing (installModelSelection)', async () => {
    const ctx = await mountHost()
    const a = await ctx.desktopBotBindings.createBot({
      displayName: 'GptBot',
      provider: 'gpt',
      modelId: 'gpt-4.1',
    })
    const b = await ctx.desktopBotBindings.createBot({
      displayName: 'DeepSeekBot',
      provider: 'deepseek',
      modelId: 'deepseek-v4-flash',
    })
    expect(ctx.desktopBotBindings.modelSelection(a.id)).toEqual({
      provider: 'gpt',
      model: 'gpt-4.1',
    })
    expect(ctx.desktopBotBindings.modelSelection(b.id)).toEqual({
      provider: 'deepseek',
      model: 'deepseek-v4-flash',
    })
    const varsA = await ctx.desktopBotBindings.assemblePromptVariables(a.id)
    const varsB = await ctx.desktopBotBindings.assemblePromptVariables(b.id)
    expect(varsA).toMatchObject({ provider: 'gpt', model: 'gpt-4.1' })
    expect(varsB).toMatchObject({ provider: 'deepseek', model: 'deepseek-v4-flash' })
    // Distinct isolate scopes — sibling bots do not share scope tags.
    expect(scopeOf(ctx.desktopBotBindings.scopeCtx(a.id)))
      .toBe(ctx.desktopBotBindings.scopeKey(a.id))
    expect(scopeOf(ctx.desktopBotBindings.scopeCtx(b.id)))
      .toBe(ctx.desktopBotBindings.scopeKey(b.id))
    expect(ctx.desktopBotBindings.scopeKey(a.id))
      .not.toBe(ctx.desktopBotBindings.scopeKey(b.id))
  })
})

describe('T012 / MOH-22 agent scopes isolated (no shared tool privilege)', () => {
  it('keeps scope-local tools executable only for the owning bot', async () => {
    const ctx = await mountHost()
    const alpha = await ctx.desktopBotBindings.createBot({
      displayName: 'Alpha',
      provider: 'gpt',
      modelId: 'gpt-4.1',
    })
    const beta = await ctx.desktopBotBindings.createBot({
      displayName: 'Beta',
      provider: 'claude',
      modelId: 'claude-sonnet',
    })
    const alphaCtx = ctx.desktopBotBindings.scopeCtx(alpha.id)
    const betaCtx = ctx.desktopBotBindings.scopeCtx(beta.id)
    alphaCtx.tools.register(privilegeTool('alpha_secret', 'ran:alpha'))
    betaCtx.tools.register(privilegeTool('beta_secret', 'ran:beta'))

    const alphaKey = ctx.desktopBotBindings.scopeKey(alpha.id)
    const betaKey = ctx.desktopBotBindings.scopeKey(beta.id)

    expect(ctx.tools.schemas(alphaKey).map(t => t.name).sort())
      .toEqual(['alpha_secret'])
    expect(ctx.tools.schemas(betaKey).map(t => t.name).sort())
      .toEqual(['beta_secret'])
    // Sibling cannot see or execute the other bot's privilege tool.
    expect(ctx.tools.get('alpha_secret', betaKey)).toBeUndefined()
    expect(ctx.tools.get('beta_secret', alphaKey)).toBeUndefined()
    expect(await runTool(ctx, 'alpha_secret', alphaKey)).toBe('ran:alpha')
    expect(await runTool(ctx, 'beta_secret', betaKey)).toBe('ran:beta')
    expect(await runTool(ctx, 'alpha_secret', betaKey)).toMatch(/unknown tool/)
    expect(await runTool(ctx, 'beta_secret', alphaKey)).toMatch(/unknown tool/)
  })

  it('does not leak bot-local tools into the global Host tools view', async () => {
    const ctx = await mountHost()
    const bot = await ctx.desktopBotBindings.createBot({
      displayName: 'Solo',
      provider: 'deepseek',
      modelId: 'deepseek-v4-flash',
    })
    ctx.desktopBotBindings.scopeCtx(bot.id).tools.register(privilegeTool('solo_only', 'ran:solo'))
    expect(ctx.tools.schemas().map(t => t.name)).not.toContain('solo_only')
    expect(ctx.tools.get('solo_only')).toBeUndefined()
  })

  it('lists two differently modeled bots without shared binding ids', async () => {
    const ctx = await mountHost()
    const ids: DesktopBotId[] = []
    for (const row of [
      { displayName: 'One', provider: 'gpt' as const, modelId: 'm1' },
      { displayName: 'Two', provider: 'claude' as const, modelId: 'm2' },
    ]) {
      ids.push((await ctx.desktopBotBindings.createBot(row)).id)
    }
    const listed = ctx.desktopBotBindings.listBots()
    expect(listed).toHaveLength(2)
    expect(listed[0]?.modelBindingId).not.toBe(listed[1]?.modelBindingId)
    expect(listed.map(b => b.displayName)).toEqual(['One', 'Two'])
    expect(ids[0]).not.toBe(ids[1])
  })
})
