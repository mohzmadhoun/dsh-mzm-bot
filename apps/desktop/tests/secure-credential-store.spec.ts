import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  SecureCredentialStore,
  SecureCredentialStoreError,
  secureCredentialStorePath,
  type SafeStorageLike,
} from '../src/secure-credential-store.ts'
import { WEDGE_PROVIDER_CREDENTIAL_REF_NAMES } from '../src/wedge-providers.ts'

function memorySafeStorage(): SafeStorageLike {
  return {
    isEncryptionAvailable: () => true,
    encryptString: plain => Buffer.from(`enc:${plain}`, 'utf8'),
    decryptString: (encrypted) => {
      const text = encrypted.toString('utf8')
      if (!text.startsWith('enc:')) throw new Error('bad ciphertext')
      return text.slice(4)
    },
  }
}

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('SecureCredentialStore (T013 / MOH-17)', () => {
  it('stores secrets via OS-backed encryption and never returns them from describe/list', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-cred-'))
    roots.push(root)
    const store = new SecureCredentialStore(secureCredentialStorePath(root), memorySafeStorage(), {})
    await store.set(WEDGE_PROVIDER_CREDENTIAL_REF_NAMES.deepseek, 'sk-secret-deepseek')
    await store.set(WEDGE_PROVIDER_CREDENTIAL_REF_NAMES.gpt, 'sk-secret-gpt')

    const presence = await store.listProviderPresence()
    expect(presence.find(row => row.provider === 'deepseek')).toEqual({
      provider: 'deepseek',
      ref: 'DEEPSEEK_API_KEY',
      configured: true,
      source: 'secure-store',
      writable: true,
    })
    expect(JSON.stringify(presence)).not.toContain('sk-secret')
    expect(await store.describe('DEEPSEEK_API_KEY')).toMatchObject({
      configured: true, source: 'secure-store', writable: true,
    })

    const disk = await readFile(secureCredentialStorePath(root), 'utf8')
    expect(disk).not.toContain('sk-secret-deepseek')
    expect(disk).not.toContain('sk-secret-gpt')
    // Ciphertext is base64 on disk; decoded payload still starts with the mock encrypt prefix.
    const encoded = JSON.parse(disk).entries.DEEPSEEK_API_KEY as string
    expect(Buffer.from(encoded, 'base64').toString('utf8')).toMatch(/^enc:/)
  })

  it('merges decrypted secrets into Host env without overriding existing env (dev/CI wins)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-cred-'))
    roots.push(root)
    const store = new SecureCredentialStore(secureCredentialStorePath(root), memorySafeStorage(), {
      OPENAI_API_KEY: 'from-ci',
    })
    await store.set('DEEPSEEK_API_KEY', 'from-store')
    await expect(store.set('OPENAI_API_KEY', 'should-fail')).rejects.toBeInstanceOf(SecureCredentialStoreError)

    const env = await store.mergeIntoEnv({ OPENAI_API_KEY: 'from-ci', PATH: '/usr/bin' })
    expect(env.DEEPSEEK_API_KEY).toBe('from-store')
    expect(env.OPENAI_API_KEY).toBe('from-ci')
    expect(env.PATH).toBe('/usr/bin')
  })

  it('redacts stored secrets from diagnostic text (session-dump hygiene)', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-cred-'))
    roots.push(root)
    const store = new SecureCredentialStore(secureCredentialStorePath(root), memorySafeStorage(), {})
    await store.set('XAI_API_KEY', 'grok-live-secret')
    await expect(store.redactSecrets('token=grok-live-secret ok')).resolves.toBe('token=[redacted:XAI_API_KEY] ok')
  })
})
