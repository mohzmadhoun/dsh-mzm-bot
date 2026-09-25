/**
 * Electron-main primary path for provider credentials (T013 / MOH-17).
 * OS-backed via Electron safeStorage; env/key files remain dev/CI only.
 * Renderer never receives raw secrets — only presence metadata.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import {
  WEDGE_PROVIDER_CREDENTIAL_REF_NAMES,
  WEDGE_PROVIDER_IDS,
  type WedgeProviderId,
} from './wedge-providers.ts'

/** Presence-only credential view safe for UI / session dumps. */
export interface ProviderCredentialPresence {
  readonly provider: WedgeProviderId
  readonly ref: string
  readonly configured: boolean
  /** Where the effective value would come from; never the value itself. */
  readonly source: 'secure-store' | 'env' | 'absent'
  readonly writable: boolean
}

/** Disk document: ciphertext only (base64 of safeStorage buffers). */
interface SecureCredentialDocument {
  readonly version: 1
  readonly entries: Record<string, string>
}

/** Abstraction over Electron safeStorage so unit tests do not need Electron. */
export interface SafeStorageLike {
  isEncryptionAvailable(): boolean
  encryptString(plainText: string): Buffer
  decryptString(encrypted: Buffer): string
}

export class SecureCredentialStoreError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SecureCredentialStoreError'
  }
}

/**
 * Encrypting credential vault for Desktop main. Secrets stay in main + OS store.
 */
export class SecureCredentialStore {
  private entries = new Map<string, Buffer>()
  private loaded = false

  /**
   * @param filePath - durable ciphertext document under the Desktop profile.
   * @param safeStorage - Electron safeStorage (or test double).
   * @param env - process env consulted for presence/shadowing (dev/CI path).
   */
  constructor(
    private readonly filePath: string,
    private readonly safeStorage: SafeStorageLike,
    private readonly env: NodeJS.ProcessEnv = process.env,
  ) {}

  /** Absolute path of the ciphertext document. */
  get path(): string { return this.filePath }

  /** Load ciphertext from disk (no-op when absent). */
  async load(): Promise<void> {
    try {
      const text = await readFile(this.filePath, 'utf8')
      const document = JSON.parse(text) as SecureCredentialDocument
      if (document.version !== 1 || typeof document.entries !== 'object' || document.entries === null) {
        throw new SecureCredentialStoreError('secure credential store: invalid document version or shape')
      }
      this.entries.clear()
      for (const [ref, encoded] of Object.entries(document.entries)) {
        if (typeof encoded !== 'string' || encoded.length === 0) {
          throw new SecureCredentialStoreError(`secure credential store: invalid ciphertext for ${ref}`)
        }
        this.entries.set(ref, Buffer.from(encoded, 'base64'))
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') {
        this.entries.clear()
      } else {
        throw error
      }
    }
    this.loaded = true
  }

  private async ensureLoaded(): Promise<void> {
    if (!this.loaded) await this.load()
  }

  private assertEncryption(): void {
    if (!this.safeStorage.isEncryptionAvailable()) {
      throw new SecureCredentialStoreError(
        'secure credential store: OS encryption is unavailable; refuse to persist provider secrets in plaintext',
      )
    }
  }

  private envValue(ref: string): string | undefined {
    const value = this.env[ref]
    return value !== undefined && value.length > 0 ? value : undefined
  }

  /**
   * Store one secret under its CredentialRef. Env-shadowed refs refuse writes
   * (same honesty as credentials-local: a shadowed write would appear to succeed).
   */
  async set(ref: string, secret: string): Promise<void> {
    if (secret.length === 0) {
      throw new SecureCredentialStoreError(`secure credential store: empty secret for ${ref}; use unset`)
    }
    if (this.envValue(ref) !== undefined) {
      throw new SecureCredentialStoreError(
        `secure credential store: "${ref}" is supplied read-only by the launching environment, so set would be shadowed`,
      )
    }
    this.assertEncryption()
    await this.ensureLoaded()
    this.entries.set(ref, this.safeStorage.encryptString(secret))
    await this.persist()
  }

  /** Remove one stored secret; absent refs are a no-op. */
  async unset(ref: string): Promise<void> {
    if (this.envValue(ref) !== undefined) {
      throw new SecureCredentialStoreError(
        `secure credential store: "${ref}" is supplied read-only by the launching environment, so unset would be shadowed`,
      )
    }
    await this.ensureLoaded()
    if (!this.entries.has(ref)) return
    this.entries.delete(ref)
    await this.persist()
  }

  /** Presence metadata for one ref — never the secret. */
  async describe(ref: string): Promise<Omit<ProviderCredentialPresence, 'provider'> & { provider?: WedgeProviderId }> {
    await this.ensureLoaded()
    if (this.envValue(ref) !== undefined) {
      return { ref, configured: true, source: 'env', writable: false }
    }
    if (this.entries.has(ref)) {
      return { ref, configured: true, source: 'secure-store', writable: true }
    }
    return { ref, configured: false, source: 'absent', writable: true }
  }

  /** Presence for every wedge provider. */
  async listProviderPresence(): Promise<readonly ProviderCredentialPresence[]> {
    await this.ensureLoaded()
    return WEDGE_PROVIDER_IDS.map((provider) => {
      const ref = WEDGE_PROVIDER_CREDENTIAL_REF_NAMES[provider]
      const env = this.envValue(ref)
      if (env !== undefined) {
        return { provider, ref, configured: true, source: 'env' as const, writable: false }
      }
      if (this.entries.has(ref)) {
        return { provider, ref, configured: true, source: 'secure-store' as const, writable: true }
      }
      return { provider, ref, configured: false, source: 'absent' as const, writable: true }
    })
  }

  /**
   * Decrypt store entries for Host spawn injection. Does not override existing
   * env keys (dev/CI env remains authoritative when already set).
   * @returns new env object; never mutates the input.
   */
  async mergeIntoEnv(base: NodeJS.ProcessEnv): Promise<NodeJS.ProcessEnv> {
    await this.ensureLoaded()
    if (this.entries.size === 0) return { ...base }
    this.assertEncryption()
    const next: NodeJS.ProcessEnv = { ...base }
    for (const [ref, ciphertext] of this.entries) {
      const existing = next[ref]
      if (existing !== undefined && existing.length > 0) continue
      next[ref] = this.safeStorage.decryptString(ciphertext)
    }
    return next
  }

  /**
   * Redaction helper for logs / session dumps: replace known secret values.
   * @param text - arbitrary diagnostic text.
   */
  async redactSecrets(text: string): Promise<string> {
    await this.ensureLoaded()
    let result = text
    for (const [ref, ciphertext] of this.entries) {
      try {
        const secret = this.safeStorage.decryptString(ciphertext)
        if (secret.length > 0) result = result.split(secret).join(`[redacted:${ref}]`)
      } catch {
        // Corrupt ciphertext: skip redaction for that entry.
      }
    }
    return result
  }

  private async persist(): Promise<void> {
    const document: SecureCredentialDocument = {
      version: 1,
      entries: Object.fromEntries([...this.entries].map(([ref, buffer]) => [ref, buffer.toString('base64')])),
    }
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 })
    await writeFile(this.filePath, `${JSON.stringify(document, null, 2)}\n`, { mode: 0o600 })
  }
}

/** Default ciphertext document path under a Desktop profile directory. */
export function secureCredentialStorePath(profileDir: string): string {
  return join(profileDir, 'secure-credentials.json')
}
