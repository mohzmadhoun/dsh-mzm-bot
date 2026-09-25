import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DesktopHostProcess } from '../src/host-process.ts'

const roots: string[] = []
const hosts: DesktopHostProcess[] = []

const HANDSHAKE = {
  framingVersion: 1,
  hostProtocolVersion: 4,
  profileId: 'desktop' as const,
  dshExactVersion: '0.1.6-alpha.2',
  clientAssetRevision: '0.1.6-alpha.2',
  channels: { unaryRpc: 'framed' as const, remoteStreams: 'framed' as const, assets: 'framed' as const },
}

function gateBHostSource(): string {
  return [
    "import { createServer } from 'node:http'",
    "import { writeFileSync } from 'node:fs'",
    "import { join } from 'node:path'",
    "import { Socket } from 'node:net'",
    `const handshake = ${JSON.stringify(HANDSHAKE)}`,
    'const framed = new Socket({ fd: 4, readable: true, writable: true })',
    'const server = createServer((request, response) => {',
    "  if (request.url === '/fatal') { process.send({ type: 'fatal', message: 'plugin unavailable' }); response.end('reported'); return }",
    "  if (request.url === '/crash') { response.end('exiting', () => { process.stderr.write('plugin crashed', () => process.exit(7)) }); return }",
    '  response.setHeader(\'content-type\', \'application/json\')',
    '  response.end(JSON.stringify({ runtime: process.argv[2], profile: process.argv[3], cwd: process.cwd() }))',
    '})',
    "server.listen(0, '127.0.0.1', () => {",
    "  writeFileSync(join(process.argv[3], 'listen-url'), 'http://127.0.0.1:' + server.address().port + '/?token=fixture')",
    '  const body = Buffer.from(JSON.stringify({ type: \'bus-open\', channels: handshake.channels }), \'utf8\')',
    '  const frame = Buffer.allocUnsafe(4 + body.byteLength)',
    '  frame.writeUInt32BE(body.byteLength, 0)',
    '  body.copy(frame, 4)',
    '  framed.write(frame)',
    "  process.send({ type: 'ready', handshake })",
    '})',
    'process.on(\'message\', message => {',
    "  if (message.type === 'update-tasks') { process.send({ type: 'update-tasks', requestId: message.requestId, active: message.action === \'lock\' }); return }",
    "  if (message.type !== 'shutdown') return",
    "  server.close(() => { writeFileSync(join(process.argv[3], 'stopped'), ''); process.send({ type: 'shutdown-complete' }, () => { process.disconnect(); process.exit(0) }) })",
    '  server.closeAllConnections()',
    '})',
  ].join('\n')
}

function projectWithHost(source = gateBHostSource()): string {
  const project = mkdtempSync(join(tmpdir(), 'dsh-desktop-host-test-'))
  roots.push(project)
  const packageRoot = join(project, 'node_modules', '@deepseek-ai', 'dsh-desktop-host')
  mkdirSync(join(packageRoot, 'lib'), { recursive: true })
  writeFileSync(join(packageRoot, 'package.json'), JSON.stringify({ name: '@deepseek-ai/dsh-desktop-host', type: 'module' }) + '\n')
  writeFileSync(join(packageRoot, 'lib', 'index.js'), source)
  return project
}

function hostProcess(runtime: string, profile = runtime, onFailure?: (error: Error) => void): DesktopHostProcess {
  const host = new DesktopHostProcess(process.execPath, runtime, profile, undefined, process.env, onFailure)
  hosts.push(host)
  return host
}

function listenUrl(project: string): string {
  return readFileSync(join(project, 'listen-url'), 'utf8')
}

afterEach(async () => {
  await Promise.all(hosts.splice(0).map(host => host.stop().catch(() => undefined)))
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe('desktop host process', () => {
  it('accepts Gate B handshake, framed pipe, and lifecycle IPC task control', async () => {
    const runtime = projectWithHost()
    const host = hostProcess(runtime)
    await expect(host.updateTasks('inspect')).rejects.toThrow('desktop update: Host is unavailable')
    const ready = await host.start()
    expect(ready.handshake).toMatchObject(HANDSHAKE)
    expect(ready.framedPipe.writable).toBe(true)
    expect(await Promise.all([host.updateTasks('inspect'), host.updateTasks('lock'), host.updateTasks('unlock')])).toEqual([false, true, false])
    expect((await fetch(listenUrl(runtime))).status).toBe(200)
    await host.stop(true)
    expect(existsSync(join(runtime, 'stopped'))).toBe(true)
    await expect(host.updateTasks('inspect')).rejects.toThrow('desktop update: Host is unavailable')
  }, 20_000)

  it('fail-closes Gate B when handshake fields are invalid', async () => {
    const source = [
      "import { Socket } from 'node:net'",
      'new Socket({ fd: 4, readable: true, writable: true })',
      "process.send({ type: 'ready', handshake: { framingVersion: 1 } })",
    ].join('\n')
    const host = hostProcess(projectWithHost(source))
    await expect(host.start()).rejects.toThrow(/gate B|handshake/)
  }, 20_000)

  it('reports fatal after readiness', async () => {
    const runtime = projectWithHost()
    const failure = vi.fn()
    const host = hostProcess(runtime, runtime, failure)
    await host.start()
    await fetch(new URL('/fatal', listenUrl(runtime)))
    await expect.poll(() => failure.mock.calls.length).toBe(1)
    expect(failure.mock.calls[0]![0]).toEqual(new Error('plugin unavailable'))
    await host.stop()
  }, 20_000)
})
