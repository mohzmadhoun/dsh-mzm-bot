import { describe, expect, it } from 'vitest'
import {
  WEDGE_PROVIDER_CREDENTIAL_REF_NAMES,
  WEDGE_PROVIDER_IDS,
  credentialRefForProvider,
  isWedgeProviderId,
  providerForCredentialRefName,
} from '../src/provider-refs.ts'

describe('wedge provider credential refs (T013 / MOH-17)', () => {
  it('maps each wedge provider to a distinct POSIX credential ref', () => {
    const refs = WEDGE_PROVIDER_IDS.map(provider => credentialRefForProvider(provider))
    expect(new Set(refs).size).toBe(WEDGE_PROVIDER_IDS.length)
    expect(refs).toEqual([
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'XAI_API_KEY',
      'DEEPSEEK_API_KEY',
    ])
  })

  it('round-trips provider ↔ ref name', () => {
    for (const provider of WEDGE_PROVIDER_IDS) {
      expect(isWedgeProviderId(provider)).toBe(true)
      expect(providerForCredentialRefName(WEDGE_PROVIDER_CREDENTIAL_REF_NAMES[provider])).toBe(provider)
    }
    expect(isWedgeProviderId('unknown')).toBe(false)
    expect(providerForCredentialRefName('NOT_A_WEDGE_KEY')).toBeUndefined()
  })
})
