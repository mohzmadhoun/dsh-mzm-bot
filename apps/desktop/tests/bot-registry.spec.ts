import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BotRegistry, BotRegistryError, botRegistryPath, parseBotCreateInput } from '../src/bot-registry.ts'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('BotRegistry (T014 / MOH-19)', () => {
  it('creates ≥2 bots with distinct model/provider assignment intent', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-bots-'))
    roots.push(root)
    const configured = new Set<string>(['gpt', 'deepseek'])
    const registry = new BotRegistry(
      botRegistryPath(root),
      provider => configured.has(provider),
      () => new Date('2026-09-25T10:00:00.000Z'),
    )

    const first = await registry.create({
      displayName: 'GPT bot', provider: 'gpt', modelId: 'gpt-4.1',
    })
    const second = await registry.create({
      displayName: 'DeepSeek bot', provider: 'deepseek', modelId: 'deepseek-chat',
    })

    expect(first.status).toBe('ready')
    expect(second.status).toBe('ready')
    expect(first.credentialRef).toBe('OPENAI_API_KEY')
    expect(second.credentialRef).toBe('DEEPSEEK_API_KEY')
    expect(first.provider).not.toBe(second.provider)
    expect(first.modelId).not.toBe(second.modelId)

    const listed = await registry.list()
    expect(listed).toHaveLength(2)
    expect(listed.map(bot => bot.displayName)).toEqual(['GPT bot', 'DeepSeek bot'])
    // Secrets never appear on bot records — only credential refs.
    expect(JSON.stringify(listed)).not.toMatch(/sk-|secret/i)
  })

  it('marks bots draft when credential is missing; rejects invalid create payloads', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-bots-'))
    roots.push(root)
    const registry = new BotRegistry(botRegistryPath(root), () => false)
    const draft = await registry.create({
      displayName: 'Claude draft', provider: 'claude', modelId: 'claude-sonnet-4',
    })
    expect(draft.status).toBe('draft')
    expect(draft.credentialRef).toBe('ANTHROPIC_API_KEY')

    expect(() => parseBotCreateInput({ displayName: '', provider: 'gpt', modelId: 'x' }))
      .toThrow(BotRegistryError)
    expect(() => parseBotCreateInput({ displayName: 'x', provider: 'nope', modelId: 'x' }))
      .toThrow(BotRegistryError)
  })
})
