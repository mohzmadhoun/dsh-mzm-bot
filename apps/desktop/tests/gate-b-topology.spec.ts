import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  DESKTOP_APP_PROTOCOL,
  DESKTOP_GATE_B_TOPOLOGY,
  DESKTOP_HOST_LIFECYCLE_IPC,
  isDesktopHostLifecycleIpcType,
} from '../src/host-framing.ts'
import { SCHEME } from '../src/ipc.ts'
import { DesktopHostProcess } from '../src/host-process.ts'

const here = dirname(fileURLToPath(import.meta.url))

describe('gate B topology lock (T005 / MOH-13)', () => {
  it('locks bundled-Node Desktop Host child + framed pipes + lifecycle IPC + dsh-app://', () => {
    expect(DESKTOP_GATE_B_TOPOLOGY).toEqual({
      hostChild: 'bundled-node-desktop-host',
      appTraffic: 'framed-pipes',
      nodeIpc: 'lifecycle-only',
      appProtocol: DESKTOP_APP_PROTOCOL,
      lifecycleIpcAllowlist: DESKTOP_HOST_LIFECYCLE_IPC,
    })
    expect(DESKTOP_APP_PROTOCOL).toBe('dsh-app:')
    expect(SCHEME).toBe('dsh-app')
    expect(`${SCHEME}:`).toBe(DESKTOP_APP_PROTOCOL)
    expect(DESKTOP_HOST_LIFECYCLE_IPC).toEqual([
      'ready', 'fatal', 'shutdown', 'shutdown-complete', 'update-tasks',
    ])
  })

  it('rejects lifecycle IPC types outside the allowlist (fail-closed)', () => {
    for (const type of DESKTOP_HOST_LIFECYCLE_IPC) expect(isDesktopHostLifecycleIpcType(type)).toBe(true)
    for (const type of ['chat', 'rpc', 'unaryRpc', 'http', 'ws', 'ready-url']) {
      expect(isDesktopHostLifecycleIpcType(type)).toBe(false)
    }
  })

  it('spawns DesktopHostProcess with framed stdio pipe (fd 4) and IPC lifecycle channel', () => {
    const source = readFileSync(join(here, '../src/host-process.ts'), 'utf8')
    expect(source).toMatch(/stdio:\s*\[[^\]]*ipc[^\]]*pipe/)
    expect(source).toMatch(/stdio\[4\]|framedPipe/)
    expect(source).toContain("['ignore', 'pipe', 'pipe', 'ipc', 'pipe']")
    expect(DesktopHostProcess.name).toBe('DesktopHostProcess')
  })

  it('does not declare loopback HTTP/WebSocket as the Shell app bus in main', () => {
    const main = readFileSync(join(here, '../src/main.ts'), 'utf8')
    expect(main).not.toMatch(/ws:\/\/127\.0\.0\.1/)
    expect(main).not.toMatch(/authenticateWebHost/)
    expect(main).not.toMatch(/forwardWebRequest/)
    expect(main).toContain("appBus: 'framed-pipe' as const")
    expect(main).toContain('hostHandshake')
  })

  it('Verifier fixture enumerates topology + allowlist (T004)', () => {
    const fixture = JSON.parse(readFileSync(join(here, 'fixtures/gate-b-handshake.json'), 'utf8')) as {
      topology: Record<string, string>
      lifecycleIpcAllowlist: string[]
      forbiddenAppBus: string[]
    }
    expect(fixture.topology.appProtocol).toBe('dsh-app:')
    expect(fixture.topology.appTraffic).toBe('framed-pipes')
    expect(fixture.topology.nodeIpc).toBe('lifecycle-only')
    expect(fixture.lifecycleIpcAllowlist).toEqual([...DESKTOP_HOST_LIFECYCLE_IPC])
    expect(fixture.forbiddenAppBus).toEqual(expect.arrayContaining(['loopback-http', 'ws://127.0.0.1']))
  })
})
