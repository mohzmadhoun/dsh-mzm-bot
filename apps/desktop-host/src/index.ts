/** Launch the Desktop profile and complete Gate B framed-pipe handshake with Electron. */

import { readFileSync } from 'node:fs'
import { Socket } from 'node:net'
import { delimiter, join } from 'node:path'
import { loadLayeredEnv, loadProfileDirectory } from '@deepseek-ai/dsh-app-boot'
import { runProfile } from '@deepseek-ai/dsh/profile-boot'
import type {} from '@deepseek-ai/dsh-client-connection'
import type {} from '@deepseek-ai/dsh-host-webserver'
import { resolveDshHome } from '@deepseek-ai/dsh-home-paths'
import * as desktopOffice from './office.ts'

import { installDesktopUpdateTaskControl } from './update-tasks.ts'
import DesktopBotBindings from './bot-bindings.ts'
import DesktopChatOnlyTrustFloor from './chat-only-trust-floor.ts'


/** Must match apps/desktop/src/host-framing.ts Gate B constants. */
const DESKTOP_FRAMING_VERSION = 1
const DESKTOP_HOST_PROTOCOL_VERSION = 4
const DESKTOP_PROFILE_ID = 'desktop'

function readPackageVersion(packageJsonPath: string): string {
  const manifest = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as { version?: unknown }
  if (typeof manifest.version !== 'string' || manifest.version.length === 0) {
    throw new Error(`desktop host: missing version in ${packageJsonPath}`)
  }
  return manifest.version
}

function openFramedAppPipe(): Socket {
  // stdio fd 4 is the Shell↔Host framed app bus (lifecycle stays on Node IPC).
  const framed = new Socket({ fd: 4, readable: true, writable: true })
  framed.unref()
  return framed
}

function writeFramedJson(stream: Socket, value: unknown): void {
  const body = Buffer.from(JSON.stringify(value), 'utf8')
  const frame = Buffer.allocUnsafe(4 + body.byteLength)
  frame.writeUInt32BE(body.byteLength, 0)
  body.copy(frame, 4)
  stream.write(frame)
}

async function main(): Promise<void> {
  const runtimeDir = process.argv[2] as string
  const projectDir = process.argv[3] as string
  const installAnchor = join(runtimeDir, 'node_modules', '@deepseek-ai', 'dsh', 'package.json')
  const profile = loadProfileDirectory('dsh', projectDir, installAnchor)
  const application = runProfile({
    environment: loadLayeredEnv('dsh'),
    profile: 'desktop',
    resolutionMode: process.argv[5] === 'runtime' ? 'runtime' : 'link',
    resolvedProfile: { profile, installAnchor },
    patchFiles: [],
    args: ['--no-open', '--port', '19387'],
    ...(process.argv[6] === undefined ? {} : {
      packageManager: {
        command: process.execPath,
        args: ['--expose-internals', process.argv[6]],
        env: {
          ELECTRON_RUN_AS_NODE: '1',
          DSH_DESKTOP_NODE_EXECUTABLE: process.execPath,
          PATH: `${process.argv[7] ?? ''}${delimiter}${process.env.PATH ?? ''}`,
        },
      },
    }),
  })
  let stopping: Promise<void> | undefined
  const control: { updateTasks?: ReturnType<typeof installDesktopUpdateTaskControl> } = {}
  const send = (message: object): Promise<void> => new Promise((resolve, reject) => {
    if (!process.connected || process.send === undefined) { resolve(); return }
    process.send(message, (error) => { if (error === null) resolve(); else reject(error) })
  })
  const stop = (): Promise<void> => stopping ??= (async () => {
    // Startup failure is reported by main; shutdown only owns a tree that booted.
    const running = await application.catch(() => undefined)
    await running?.shutdown.shutdown(0)
    await send({ type: 'shutdown-complete' })
    if (process.connected) process.disconnect()
  })()
  process.on('message', (message: unknown) => {
    if (typeof message !== 'object' || message === null || !('type' in message)) return
    if (message.type === 'shutdown') { void stop(); return }
    if (message.type !== 'update-tasks' || !('requestId' in message) || !Number.isSafeInteger(message.requestId)
      || !('action' in message) || !['inspect', 'lock', 'unlock'].includes(String(message.action))) return
    void (async () => {
      try {
        if (stopping !== undefined || control.updateTasks === undefined) throw new Error('desktop update: Host is unavailable')
        const active = await control.updateTasks(message.action as 'inspect' | 'lock' | 'unlock')
        await send({ type: 'update-tasks', requestId: message.requestId, active })
      } catch (error) {
        await send({ type: 'update-tasks', requestId: message.requestId, active: true,
          error: error instanceof Error ? error.message : String(error) })
      }
    })().catch((error: unknown) => { console.error(error) })
  })
  process.once('disconnect', () => { void stop() })
  const { ctx } = await application
  control.updateTasks = installDesktopUpdateTaskControl(ctx)
  await ctx.plugin(desktopOffice, {
    source: process.argv[4] ?? join(runtimeDir, '..', 'runtime', 'primary-runtime'),
    root: join(resolveDshHome(), 'dsh-runtimes', 'dsh-primary-runtime'),
  })
  // US1 T011/T012: per-bot model binding + isolated scopes (chat-only; no Shell/box/MCP).
  // Inject waits for Host tools + systemPrompt from the Desktop profile composition.
  await ctx.plugin(DesktopBotBindings)
  // US1 T016/T017: chat-only trust floor — required services assert, external send/post
  // denied via tools.guard, session surfaces sanitized. strictBackends false until T018
  // disables leftover base-bundle shell/web/MCP profile rows; capability gate is still live.
  await ctx.plugin(DesktopChatOnlyTrustFloor, { strictBackends: false })
  const dshExactVersion = readPackageVersion(installAnchor)
  const clientAssetRevision = dshExactVersion
  const handshake = {
    framingVersion: DESKTOP_FRAMING_VERSION,
    hostProtocolVersion: DESKTOP_HOST_PROTOCOL_VERSION,
    profileId: DESKTOP_PROFILE_ID,
    dshExactVersion,
    clientAssetRevision,
    channels: {
      unaryRpc: 'framed' as const,
      remoteStreams: 'framed' as const,
      assets: 'framed' as const,
    },
  }
  const framedPipe = openFramedAppPipe()
  writeFramedJson(framedPipe, { type: 'bus-open', channels: handshake.channels })
  // Web server may still boot for Host-side composition, but Gate B app bus is framed pipes only.
  if (process.connected) {
    process.send?.(
      { type: 'ready', handshake, injections: ctx.webServer.collectIndexInjections() },
      (error) => { if (error !== null) console.error(error) },
    )
  }
}

if (import.meta.main) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error)
    if (process.connected) process.send?.({ type: 'fatal', message }, (error) => { if (error !== null) console.error(error) })
    console.error(error)
    process.exitCode = 1
    if (process.connected) process.disconnect()
  })
}
