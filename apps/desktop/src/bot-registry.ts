/**
 * Shell-side bot create + model/provider assignment intent (T014 / MOH-19).
 * Persists locally for ≥2 bots; Host isolate binding (T011) is Runtime-owned.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  credentialRefNameForProvider,
  isWedgeProviderId,
  type WedgeProviderId,
} from './wedge-providers.ts'

/** User-initiated create payload from the Shell UI. */
export interface BotCreateInput {
  readonly displayName: string
  readonly provider: WedgeProviderId
  readonly modelId: string
}

/** Persisted bot + assignment intent (credentialRef is a reference, never a secret). */
export interface DesktopBotRecord {
  readonly id: string
  readonly displayName: string
  readonly provider: WedgeProviderId
  readonly modelId: string
  readonly credentialRef: string
  readonly status: 'draft' | 'ready' | 'error'
  readonly createdAt: string
}

interface BotRegistryDocument {
  readonly version: 1
  readonly bots: DesktopBotRecord[]
}

export class BotRegistryError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BotRegistryError'
  }
}

/** Normalize and validate a create request; throws {@link BotRegistryError} on refusal. */
export function parseBotCreateInput(raw: unknown): BotCreateInput {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    throw new BotRegistryError('bot create: payload must be an object')
  }
  const body = raw as Record<string, unknown>
  const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : ''
  if (displayName.length === 0 || displayName.length > 80) {
    throw new BotRegistryError('bot create: displayName is required (1–80 characters)')
  }
  if (typeof body.provider !== 'string' || !isWedgeProviderId(body.provider)) {
    throw new BotRegistryError('bot create: provider must be one of gpt|claude|grok|deepseek')
  }
  const modelId = typeof body.modelId === 'string' ? body.modelId.trim() : ''
  if (modelId.length === 0 || modelId.length > 120) {
    throw new BotRegistryError('bot create: modelId is required (1–120 characters)')
  }
  return { displayName, provider: body.provider, modelId }
}

/**
 * Durable Shell bot list for the wedge create path.
 */
export class BotRegistry {
  private bots: DesktopBotRecord[] = []
  private loaded = false

  /**
   * @param filePath - JSON document under the Desktop profile.
   * @param credentialConfigured - whether the provider's credential is present (sets ready vs draft).
   * @param now - clock for createdAt (injectable in tests).
   */
  constructor(
    private readonly filePath: string,
    private readonly credentialConfigured: (provider: WedgeProviderId) => boolean | Promise<boolean>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  get path(): string { return this.filePath }

  async load(): Promise<void> {
    try {
      const text = await readFile(this.filePath, 'utf8')
      const document = JSON.parse(text) as BotRegistryDocument
      if (document.version !== 1 || !Array.isArray(document.bots)) {
        throw new BotRegistryError('bot registry: invalid document')
      }
      this.bots = document.bots.map(validateStoredBot)
    } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') this.bots = []
      else throw error
    }
    this.loaded = true
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.load()
  }

  async list(): Promise<readonly DesktopBotRecord[]> {
    await this.ensureLoaded()
    return [...this.bots]
  }

  async create(raw: unknown): Promise<DesktopBotRecord> {
    const input = parseBotCreateInput(raw)
    await this.ensureLoaded()
    const configured = await this.credentialConfigured(input.provider)
    const record: DesktopBotRecord = {
      id: randomUUID(),
      displayName: input.displayName,
      provider: input.provider,
      modelId: input.modelId,
      credentialRef: credentialRefNameForProvider(input.provider),
      status: configured ? 'ready' : 'draft',
      createdAt: this.now().toISOString(),
    }
    this.bots = [...this.bots, record]
    await this.persist()
    return record
  }

  private async persist(): Promise<void> {
    const document: BotRegistryDocument = { version: 1, bots: this.bots }
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 })
    await writeFile(this.filePath, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 })
  }
}

function validateStoredBot(value: unknown): DesktopBotRecord {
  if (typeof value !== 'object' || value === null) throw new BotRegistryError('bot registry: invalid bot row')
  const row = value as Record<string, unknown>
  if (typeof row.id !== 'string' || row.id.length === 0) throw new BotRegistryError('bot registry: bot id required')
  if (typeof row.displayName !== 'string') throw new BotRegistryError('bot registry: displayName required')
  if (typeof row.provider !== 'string' || !isWedgeProviderId(row.provider)) {
    throw new BotRegistryError('bot registry: invalid provider')
  }
  if (typeof row.modelId !== 'string' || row.modelId.length === 0) throw new BotRegistryError('bot registry: modelId required')
  if (typeof row.credentialRef !== 'string' || row.credentialRef.length === 0) {
    throw new BotRegistryError('bot registry: credentialRef required')
  }
  if (row.status !== 'draft' && row.status !== 'ready' && row.status !== 'error') {
    throw new BotRegistryError('bot registry: invalid status')
  }
  if (typeof row.createdAt !== 'string') throw new BotRegistryError('bot registry: createdAt required')
  return {
    id: row.id,
    displayName: row.displayName,
    provider: row.provider,
    modelId: row.modelId,
    credentialRef: row.credentialRef,
    status: row.status,
    createdAt: row.createdAt,
  }
}

/** Default bot registry path under a Desktop profile directory. */
export function botRegistryPath(profileDir: string): string {
  return join(profileDir, 'bots.json')
}
