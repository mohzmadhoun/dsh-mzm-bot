/**
 * Verifier-shaped units for US1 T016 (chat-only Host) + T017 (trust floor).
 * Spec: FR-003 / FR-009; plan trust floor / P1 In-Out.
 */

import { describe, expect, it } from 'vitest'
import { Context, Service } from '@deepseek-ai/cordis'
import SystemPrompt from '@deepseek-ai/dsh-system-prompt'
import ToolRuntime from '@deepseek-ai/dsh-tools'
import type { ToolDefinition } from '@deepseek-ai/dsh-tools'
import { ToolCallId } from '@deepseek-ai/dsh-llm'
import LlmRuntime from '@deepseek-ai/dsh-llm'
import DesktopChatOnlyTrustFloor, {
  CHAT_ONLY_FORBIDDEN_PROFILE_IDS,
  CHAT_ONLY_FORBIDDEN_SERVICES,
  CHAT_ONLY_REQUIRED_SERVICES,
  auditChatOnlyProfileRows,
  assertChatOnlyForbiddenBackendsAbsent,
  assertChatOnlyHostComposition,
  assertChatOnlyRequiredServices,
  desktopChatOnlyProfilePatch,
  isExternalSendPostTool,
  sanitizeSessionSurface,
  sessionSafeModelBinding,
} from '../src/chat-only-trust-floor.ts'
import DesktopBotBindings from '../src/bot-bindings.ts'
import { brandString } from '@deepseek-ai/dsh-brand'
import type { DesktopBotId, DesktopModelBindingId } from '../src/bot-bindings.ts'

const signal = new AbortController().signal

/** Minimal stand-in so required `sessions` is present without pulling session persistence. */
class SessionsStub extends Service {
  constructor(ctx: Context) {
    super(ctx, 'sessions')
  }
}

/** Local shell/box backend stand-in for negative composition checks. */
class ShellBackendStub extends Service {
  constructor(ctx: Context) {
    super(ctx, 'shell')
  }
}

/** MCP resources backend stand-in for negative composition checks. */
class McpResourcesStub extends Service {
  constructor(ctx: Context) {
    super(ctx, 'mcpResources')
  }
}

async function mountChatOnlyHost(options: { strictBackends?: boolean } = {}): Promise<Context> {
  const ctx = new Context()
  await ctx.plugin(SystemPrompt, {})
  await ctx.plugin(ToolRuntime)
  await ctx.plugin(LlmRuntime)
  await ctx.plugin(SessionsStub)
  await ctx.plugin(DesktopChatOnlyTrustFloor, {
    strictBackends: options.strictBackends ?? true,
  })
  return ctx
}

function echoTool(name: string): ToolDefinition {
  return {
    name,
    description: `probe ${name}`,
    parameters: { type: 'object', properties: {} },
    output: {
      schema: { type: 'string' },
      render: (_args, value) => [{ type: 'text', text: value as string }],
    },
    execute: (): Promise<string> => Promise.resolve(`ran:${name}`),
  }
}

async function runTool(ctx: Context, name: string): Promise<string> {
  const result = await ctx.tools.execute({
    signal,
    callId: ToolCallId(`chat-only-${name}`),
    name,
    arguments: {},
  })
  const first = result.content[0]
  return first?.type === 'text' ? first.text : JSON.stringify(result.content)
}

describe('T016 / MOH-18 chat-only Host composition (FR-003)', () => {
  it('requires sessions + llm + tools and keeps shell/MCP backends absent', async () => {
    const ctx = await mountChatOnlyHost({ strictBackends: true })
    expect(CHAT_ONLY_REQUIRED_SERVICES).toEqual(['tools', 'llm', 'sessions'])
    expect(CHAT_ONLY_FORBIDDEN_SERVICES).toEqual(['shell', 'mcpResources'])
    expect(() => assertChatOnlyHostComposition(ctx)).not.toThrow()
    const status = ctx.desktopChatOnlyTrustFloor.compositionStatus()
    expect(status.chatOnly).toBe(true)
    expect(status.requiredMissing).toEqual([])
    expect(status.forbiddenPresent).toEqual([])
    expect(status.mcpCapabilityOff).toBe(true)
    expect(ctx.get('shell')).toBeUndefined()
    expect(ctx.get('mcpResources')).toBeUndefined()
    expect(ctx.get('tools')).toBeDefined()
    expect(ctx.get('llm')).toBeDefined()
    expect(ctx.get('sessions')).toBeDefined()
  })

  it('fails closed when required services are missing', async () => {
    const ctx = new Context()
    await ctx.plugin(ToolRuntime)
    expect(() => assertChatOnlyRequiredServices(ctx)).toThrow(/missing required service/)
  })

  it('fails closed when shell or MCP backends are mounted under strict mode', async () => {
    const withShell = new Context()
    await withShell.plugin(SystemPrompt, {})
    await withShell.plugin(ToolRuntime)
    await withShell.plugin(LlmRuntime)
    await withShell.plugin(SessionsStub)
    await withShell.plugin(ShellBackendStub)
    expect(() => assertChatOnlyForbiddenBackendsAbsent(withShell)).toThrow(/forbidden backend/)
    await expect(withShell.plugin(DesktopChatOnlyTrustFloor, { strictBackends: true }))
      .rejects.toThrow(/forbidden backend/)

    const withMcp = new Context()
    await withMcp.plugin(SystemPrompt, {})
    await withMcp.plugin(ToolRuntime)
    await withMcp.plugin(LlmRuntime)
    await withMcp.plugin(SessionsStub)
    await withMcp.plugin(McpResourcesStub)
    await expect(withMcp.plugin(DesktopChatOnlyTrustFloor, { strictBackends: true }))
      .rejects.toThrow(/mcpResources/)
  })

  it('audits base-bundle profile rows and exports a disable patch for T018', () => {
    const dirty = auditChatOnlyProfileRows([
      { id: 'session', name: '@deepseek-ai/dsh-session' },
      { id: 'llm', name: '@deepseek-ai/dsh-llm' },
      { id: 'tools', name: '@deepseek-ai/dsh-tools' },
      { id: 'tool-bash', name: '@deepseek-ai/dsh-tool-bash' },
      { id: 'mcp-resources', name: '@deepseek-ai/dsh-mcp-resources' },
      { id: 'tool-web', name: '@deepseek-ai/dsh-tool-web', disabled: true },
    ])
    expect(dirty.ok).toBe(false)
    expect(dirty.activeForbiddenIds).toEqual(['mcp-resources', 'tool-bash'])

    const patch = desktopChatOnlyProfilePatch()
    expect(patch.map(row => row.id).sort()).toEqual([...CHAT_ONLY_FORBIDDEN_PROFILE_IDS].sort())
    expect(patch.every(row => row.disabled === true)).toBe(true)

    const cleaned = auditChatOnlyProfileRows([
      { id: 'session', name: '@deepseek-ai/dsh-session' },
      { id: 'llm', name: '@deepseek-ai/dsh-llm' },
      { id: 'tools', name: '@deepseek-ai/dsh-tools' },
      ...patch,
    ])
    expect(cleaned.ok).toBe(true)
    expect(cleaned.activeForbiddenIds).toEqual([])
  })
})

describe('T017 / MOH-20 trust floor — no external send/post; no secret dumps (FR-009)', () => {
  it('denies web/shell/MCP tools at the tools.guard capability gate', async () => {
    const ctx = await mountChatOnlyHost({ strictBackends: true })
    for (const name of ['web_fetch', 'web_search', 'bash', 'pwsh', 'list_mcp_resources', 'mcp__demo__echo']) {
      expect(isExternalSendPostTool(name)).toBe(true)
      expect(ctx.desktopChatOnlyTrustFloor.wouldDenyTool(name)).toBe(true)
      ctx.tools.register(echoTool(name))
      expect(await runTool(ctx, name)).toMatch(/P1 trust floor/)
    }
    // Non-external tool still runs.
    ctx.tools.register(echoTool('echo_local'))
    expect(isExternalSendPostTool('echo_local')).toBe(false)
    expect(await runTool(ctx, 'echo_local')).toBe('ran:echo_local')
  })

  it('still deny-closes external tools when leftover backends are tolerated (Host boot mode)', async () => {
    const ctx = new Context()
    await ctx.plugin(SystemPrompt, {})
    await ctx.plugin(ToolRuntime)
    await ctx.plugin(LlmRuntime)
    await ctx.plugin(SessionsStub)
    await ctx.plugin(ShellBackendStub)
    await ctx.plugin(DesktopChatOnlyTrustFloor, { strictBackends: false })
    expect(ctx.desktopChatOnlyTrustFloor.compositionStatus().chatOnly).toBe(false)
    expect(ctx.desktopChatOnlyTrustFloor.compositionStatus().forbiddenPresent).toEqual(['shell'])
    expect(ctx.desktopChatOnlyTrustFloor.compositionStatus().mcpCapabilityOff).toBe(true)
    ctx.tools.register(echoTool('bash'))
    expect(await runTool(ctx, 'bash')).toMatch(/cannot send\/post externally/)
  })

  it('sanitizes session surfaces and keeps only credentialRef on bindings', async () => {
    const dirty = {
      turn: 1,
      provider: 'gpt',
      apiKey: 'sk-live-SHOULD-NOT-LEAK',
      nested: {
        password: 'hunter2',
        credentialRef: 'OPENAI_API_KEY',
        token: 'tok_secret',
      },
      messages: [{ role: 'user', content: 'hi', authorization: 'Bearer x' }],
    }
    const clean = sanitizeSessionSurface(dirty)
    expect(clean).toEqual({
      turn: 1,
      provider: 'gpt',
      nested: { credentialRef: 'OPENAI_API_KEY' },
      messages: [{ role: 'user', content: 'hi' }],
    })
    expect(JSON.stringify(clean)).not.toMatch(/sk-live|hunter2|tok_secret|Bearer/)

    const binding = sessionSafeModelBinding({
      id: brandString<DesktopModelBindingId>('desktop-binding-1'),
      botId: brandString<DesktopBotId>('desktop-bot-1'),
      provider: 'gpt',
      modelId: 'gpt-4.1',
      credentialRef: 'OPENAI_API_KEY',
    })
    expect(binding).toEqual({
      id: 'desktop-binding-1',
      botId: 'desktop-bot-1',
      provider: 'gpt',
      modelId: 'gpt-4.1',
      credentialRef: 'OPENAI_API_KEY',
    })
    expect(Object.keys(binding).sort()).toEqual([
      'botId', 'credentialRef', 'id', 'modelId', 'provider',
    ])
  })

  it('composes with DesktopBotBindings without exposing secret dumps on Host surfaces', async () => {
    const ctx = await mountChatOnlyHost({ strictBackends: true })
    await ctx.plugin(DesktopBotBindings)
    const bot = await ctx.desktopBotBindings.createBot({
      displayName: 'Safe',
      provider: 'claude',
      modelId: 'claude-sonnet',
      credentialRef: 'ANTHROPIC_API_KEY',
    })
    const binding = ctx.desktopBotBindings.bindingFor(bot.id)
    expect(binding).toBeDefined()
    const surface = ctx.desktopChatOnlyTrustFloor.sanitizeForSession({
      bot,
      binding,
      leak: { apiKey: 'SHOULD_NOT_APPEAR', secret: 'nope' },
    })
    expect(JSON.stringify(surface)).toContain('ANTHROPIC_API_KEY')
    expect(JSON.stringify(surface)).not.toMatch(/SHOULD_NOT_APPEAR|nope/)
    expect(surface.leak).toEqual({})
  })
})
