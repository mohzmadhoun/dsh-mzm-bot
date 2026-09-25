import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DESKTOP_HOST_PROTOCOL_VERSION } from '../src/host-protocol.ts'
import {
  DESKTOP_FRAMING_VERSION,
  DESKTOP_FRAMED_CHANNEL_NAMES,
  DESKTOP_PROFILE_ID,
  acceptDesktopHostHandshake,
  desktopHostHandshakeShape,
  DesktopHostHandshakeError,
} from '../src/host-framing.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('gate B handshake acceptance (T006 / MOH-12)', () => {
  it('enumerates the six normative handshake fields + accepted framing version (T004)', () => {
    const fixture = JSON.parse(readFileSync(join(here, 'fixtures/gate-b-handshake.json'), 'utf8')) as {
      acceptedFramingVersion: number
      hostProtocolVersion: number
      requiredHandshakeFields: { name: string }[]
      requiredFramedChannels: string[]
    }
    expect(fixture.acceptedFramingVersion).toBe(DESKTOP_FRAMING_VERSION)
    expect(fixture.hostProtocolVersion).toBe(DESKTOP_HOST_PROTOCOL_VERSION)
    expect(fixture.requiredHandshakeFields.map(field => field.name)).toEqual([
      'framingVersion',
      'hostProtocolVersion',
      'profileId',
      'dshExactVersion',
      'clientAssetRevision',
      'channels',
    ])
    expect(fixture.requiredFramedChannels).toEqual([...DESKTOP_FRAMED_CHANNEL_NAMES])
  })

  it('accepts a well-typed Gate B handshake on the Desktop startup path shape', () => {
    const accepted = acceptDesktopHostHandshake(desktopHostHandshakeShape())
    expect(accepted).toEqual({
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
    })
  })

  it.each([
    ['missing framingVersion', desktopHostHandshakeShape({ framingVersion: undefined })],
    ['type mismatch framingVersion', desktopHostHandshakeShape({ framingVersion: '1' })],
    ['framing version mismatch', desktopHostHandshakeShape({ framingVersion: DESKTOP_FRAMING_VERSION + 1 })],
    ['host protocol mismatch', desktopHostHandshakeShape({ hostProtocolVersion: 999 })],
    ['wrong profileId', desktopHostHandshakeShape({ profileId: 'web' })],
    ['missing dshExactVersion', desktopHostHandshakeShape({ dshExactVersion: '' })],
    ['missing clientAssetRevision', desktopHostHandshakeShape({ clientAssetRevision: '' })],
    ['missing unaryRpc channel', desktopHostHandshakeShape({ channels: { remoteStreams: 'framed', assets: 'framed' } })],
    ['forbidden loopback HTTP app bus', desktopHostHandshakeShape({
      channels: { unaryRpc: 'framed', remoteStreams: 'framed', assets: 'framed', loopbackHttp: 'http://127.0.0.1' },
    })],
    ['forbidden http transport', desktopHostHandshakeShape({
      channels: { unaryRpc: 'http', remoteStreams: 'framed', assets: 'framed' },
    })],
  ])('fail-closed on %s', (_label, value) => {
    // Remove keys set to undefined so "missing" cases are actually missing.
    const payload = Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined))
    expect(() => acceptDesktopHostHandshake(payload)).toThrow(DesktopHostHandshakeError)
  })
})
