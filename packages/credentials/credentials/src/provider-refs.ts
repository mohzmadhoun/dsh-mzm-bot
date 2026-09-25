/**
 * Wedge provider → credential-ref mapping for in-app auth (T013 / MOH-17).
 * Values are CredentialRef names; secret material stays behind the credential seam.
 * @module @deepseek-ai/dsh-credentials/provider-refs
 */

import { brandString } from '@deepseek-ai/dsh-brand'
import type { CredentialRef } from './types.ts'

/** Providers assignable on the P1 multi-model wedge (as available in user configuration). */
export const WEDGE_PROVIDER_IDS = ['gpt', 'claude', 'grok', 'deepseek'] as const

/** One of {@link WEDGE_PROVIDER_IDS}. */
export type WedgeProviderId = (typeof WEDGE_PROVIDER_IDS)[number]

/** Default CredentialRef name for each wedge provider's API key. */
export const WEDGE_PROVIDER_CREDENTIAL_REF_NAMES = {
  gpt: 'OPENAI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
  grok: 'XAI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
} as const satisfies Record<WedgeProviderId, string>

/**
 * Whether a string is a known wedge provider id.
 * @param value - candidate provider id.
 */
export function isWedgeProviderId(value: string): value is WedgeProviderId {
  return (WEDGE_PROVIDER_IDS as readonly string[]).includes(value)
}

/**
 * CredentialRef the wedge uses for one provider's API key.
 * @param provider - wedge provider id.
 */
export function credentialRefForProvider(provider: WedgeProviderId): CredentialRef {
  return brandString<CredentialRef>(WEDGE_PROVIDER_CREDENTIAL_REF_NAMES[provider])
}

/**
 * Provider that owns a known wedge credential ref, if any.
 * @param ref - credential reference name.
 */
export function providerForCredentialRefName(ref: string): WedgeProviderId | undefined {
  for (const provider of WEDGE_PROVIDER_IDS) {
    if (WEDGE_PROVIDER_CREDENTIAL_REF_NAMES[provider] === ref) return provider
  }
  return undefined
}
