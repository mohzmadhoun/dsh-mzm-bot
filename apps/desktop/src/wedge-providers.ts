/**
 * Desktop-local copy of wedge provider → credential-ref names (T013 / MOH-17).
 * Kept free of the credentials package so Electron main does not bundle Cordis.
 * Parity with packages/credentials is locked by wedge-providers.spec.ts.
 */

/** Providers assignable on the P1 multi-model wedge. */
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

/** Whether a string is a known wedge provider id. */
export function isWedgeProviderId(value: string): value is WedgeProviderId {
  return (WEDGE_PROVIDER_IDS as readonly string[]).includes(value)
}

/** CredentialRef name for a wedge provider. */
export function credentialRefNameForProvider(provider: WedgeProviderId): string {
  return WEDGE_PROVIDER_CREDENTIAL_REF_NAMES[provider]
}
