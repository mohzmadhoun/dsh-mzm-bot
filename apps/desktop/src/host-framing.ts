/** Shell↔Host entry gate B framing handshake (fail-closed). */

import { DESKTOP_HOST_PROTOCOL_VERSION } from './host-protocol.ts'

/** Framed-pipe protocol generation accepted by Desktop Gate B. */
export const DESKTOP_FRAMING_VERSION = 1 as const

/** Desktop profile id required by Gate B. */
export const DESKTOP_PROFILE_ID = 'desktop' as const

/** App protocol scheme for Desktop documents (`dsh-app://`). */
export const DESKTOP_APP_PROTOCOL = 'dsh-app:' as const

/** Node IPC lifecycle allowlist (Gate B). Chat/RPC over IPC is forbidden. */
export const DESKTOP_HOST_LIFECYCLE_IPC = [
  'ready',
  'fatal',
  'shutdown',
  'shutdown-complete',
  'update-tasks',
] as const

export type DesktopHostLifecycleIpcType = (typeof DESKTOP_HOST_LIFECYCLE_IPC)[number]

/** Framed app-bus channel names required by Gate B. */
export const DESKTOP_FRAMED_CHANNEL_NAMES = ['unaryRpc', 'remoteStreams', 'assets'] as const

export type DesktopFramedChannelName = (typeof DESKTOP_FRAMED_CHANNEL_NAMES)[number]

/** Transport token for framed-pipe app channels. */
export type DesktopFramedTransport = 'framed'

/** Channel map declared by a Gate B handshake. */
export type DesktopHostChannels = {
  readonly [K in DesktopFramedChannelName]: DesktopFramedTransport
}

/** Normative Shell↔Host Gate B handshake fields. */
export interface DesktopHostHandshake {
  readonly framingVersion: number
  readonly hostProtocolVersion: number
  readonly profileId: string
  readonly dshExactVersion: string
  readonly clientAssetRevision: string
  readonly channels: DesktopHostChannels
}

/** Fail-closed Gate B handshake rejection. */
export class DesktopHostHandshakeError extends Error {}

/** Topology facts Verifier proves for Gate B (FR-001). */
export interface DesktopGateBTopology {
  readonly hostChild: 'bundled-node-desktop-host'
  readonly appTraffic: 'framed-pipes'
  readonly nodeIpc: 'lifecycle-only'
  readonly appProtocol: typeof DESKTOP_APP_PROTOCOL
  readonly lifecycleIpcAllowlist: typeof DESKTOP_HOST_LIFECYCLE_IPC
}

/** Locked Gate B topology description. */
export const DESKTOP_GATE_B_TOPOLOGY = {
  hostChild: 'bundled-node-desktop-host',
  appTraffic: 'framed-pipes',
  nodeIpc: 'lifecycle-only',
  appProtocol: DESKTOP_APP_PROTOCOL,
  lifecycleIpcAllowlist: DESKTOP_HOST_LIFECYCLE_IPC,
} as const satisfies DesktopGateBTopology

/**
 * @param type - Candidate Node IPC message type.
 * @returns Whether the type is on the lifecycle allowlist.
 */
export function isDesktopHostLifecycleIpcType(type: unknown): type is DesktopHostLifecycleIpcType {
  return typeof type === 'string' && (DESKTOP_HOST_LIFECYCLE_IPC as readonly string[]).includes(type)
}

function isUint(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && Number.isSafeInteger(value)
}

function declaresForbiddenAppBus(value: unknown): boolean {
  if (typeof value !== 'string') return false
  const normalized = value.toLowerCase()
  return normalized.includes('http') || normalized.includes('ws:') || normalized.includes('loopback')
    || normalized.includes('127.0.0.1') || normalized.includes('localhost')
}

/**
 * Accept a Gate B handshake or throw fail-closed.
 * @param value - Unknown ready.handshake payload from the Host child.
 * @returns Normative handshake facts.
 */
export function acceptDesktopHostHandshake(value: unknown): DesktopHostHandshake {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new DesktopHostHandshakeError('desktop gate B: handshake missing')
  }
  const candidate = value as Record<string, unknown>
  for (const field of [
    'framingVersion',
    'hostProtocolVersion',
    'profileId',
    'dshExactVersion',
    'clientAssetRevision',
    'channels',
  ] as const) {
    if (!(field in candidate) || candidate[field] === undefined || candidate[field] === null) {
      throw new DesktopHostHandshakeError(`desktop gate B: missing handshake field ${field}`)
    }
  }
  if (!isUint(candidate.framingVersion)) {
    throw new DesktopHostHandshakeError('desktop gate B: framingVersion must be a uint')
  }
  if (candidate.framingVersion !== DESKTOP_FRAMING_VERSION) {
    throw new DesktopHostHandshakeError(
      `desktop gate B: framingVersion mismatch (got ${String(candidate.framingVersion)}, want ${String(DESKTOP_FRAMING_VERSION)})`,
    )
  }
  if (!isUint(candidate.hostProtocolVersion)) {
    throw new DesktopHostHandshakeError('desktop gate B: hostProtocolVersion must be a uint')
  }
  if (candidate.hostProtocolVersion !== DESKTOP_HOST_PROTOCOL_VERSION) {
    throw new DesktopHostHandshakeError(
      `desktop gate B: hostProtocolVersion mismatch (got ${String(candidate.hostProtocolVersion)}, want ${String(DESKTOP_HOST_PROTOCOL_VERSION)})`,
    )
  }
  if (candidate.profileId !== DESKTOP_PROFILE_ID) {
    throw new DesktopHostHandshakeError('desktop gate B: profileId must be desktop')
  }
  if (typeof candidate.dshExactVersion !== 'string' || candidate.dshExactVersion.length === 0) {
    throw new DesktopHostHandshakeError('desktop gate B: dshExactVersion must be a non-empty string')
  }
  if (typeof candidate.clientAssetRevision !== 'string' || candidate.clientAssetRevision.length === 0) {
    throw new DesktopHostHandshakeError('desktop gate B: clientAssetRevision must be a non-empty string')
  }
  if (typeof candidate.channels !== 'object' || candidate.channels === null || Array.isArray(candidate.channels)) {
    throw new DesktopHostHandshakeError('desktop gate B: channels must be an object')
  }
  const channels = candidate.channels as Record<string, unknown>
  for (const name of DESKTOP_FRAMED_CHANNEL_NAMES) {
    if (!(name in channels)) {
      throw new DesktopHostHandshakeError(`desktop gate B: missing channels.${name}`)
    }
    if (channels[name] !== 'framed') {
      throw new DesktopHostHandshakeError(`desktop gate B: channels.${name} must be framed`)
    }
  }
  for (const [name, transport] of Object.entries(channels)) {
    if (declaresForbiddenAppBus(name) || declaresForbiddenAppBus(transport)) {
      throw new DesktopHostHandshakeError('desktop gate B: channels must not declare loopback HTTP as the app bus')
    }
    if (transport !== 'framed') {
      throw new DesktopHostHandshakeError(`desktop gate B: channel ${name} must use framed transport`)
    }
  }
  return {
    framingVersion: DESKTOP_FRAMING_VERSION,
    hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
    profileId: DESKTOP_PROFILE_ID,
    dshExactVersion: candidate.dshExactVersion,
    clientAssetRevision: candidate.clientAssetRevision,
    channels: {
      unaryRpc: 'framed',
      remoteStreams: 'framed',
      assets: 'framed',
    },
  }
}

/**
 * Build a raw handshake object for fixtures (not yet fail-closed validated).
 * @param overrides - Field replacements for negative tests.
 * @returns Plain handshake-shaped object.
 */
export function desktopHostHandshakeShape(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    framingVersion: DESKTOP_FRAMING_VERSION,
    hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
    profileId: DESKTOP_PROFILE_ID,
    dshExactVersion: '0.1.6-alpha.2',
    clientAssetRevision: '0.1.6-alpha.2',
    channels: {
      unaryRpc: 'framed',
      remoteStreams: 'framed',
      assets: 'framed',
    },
    ...overrides,
  }
}
