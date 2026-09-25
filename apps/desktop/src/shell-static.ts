/**
 * Serve Desktop-owned shell documents from apps/desktop/renderer (Gate B:
 * local shell pages / IPC — not Host HTTP and not a loopback app bus).
 */

import { readFile } from 'node:fs/promises'
import { extname, join, resolve, sep } from 'node:path'

const MIME: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
}

/**
 * Resolve a shell URL pathname to a file under the renderer root.
 * @param pathname - URL pathname (e.g. `/bot-create.html`).
 * @param rendererRoot - Absolute renderer directory.
 * @returns Absolute file path, or undefined when the path escapes the root.
 */
export function resolveShellAssetPath(pathname: string, rendererRoot: string): string | undefined {
  const relative = decodeURIComponent(pathname).replace(/^\/+/, '')
  if (relative.length === 0 || relative.includes('\0') || relative.includes('..')) return undefined
  const root = resolve(rendererRoot)
  const target = resolve(root, relative)
  if (target !== root && !target.startsWith(root + sep)) return undefined
  return target
}

/**
 * Read a shell static asset for `dsh-app://shell/...`.
 * @param request - Protocol request.
 * @param rendererRoot - Absolute renderer directory (packaged or repo).
 */
export async function serveShellStatic(request: Request, rendererRoot: string): Promise<Response> {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405 })
  const url = new URL(request.url)
  const target = resolveShellAssetPath(url.pathname, rendererRoot)
  if (target === undefined) return new Response(null, { status: 400 })
  try {
    const body = await readFile(target)
    return new Response(request.method === 'HEAD' ? null : body, {
      headers: { 'content-type': MIME[extname(target)] ?? 'application/octet-stream' },
    })
  } catch (error) {
    if ((error as NodeJS.ErrnoException | null)?.code === 'ENOENT') return new Response(null, { status: 404 })
    throw error
  }
}

/** Default renderer directory next to the packaged/app path. */
export function desktopRendererRoot(appPath: string): string {
  return join(appPath, 'renderer')
}
