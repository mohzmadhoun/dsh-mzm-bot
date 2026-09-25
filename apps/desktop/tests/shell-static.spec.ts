import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveShellAssetPath, serveShellStatic } from '../src/shell-static.ts'

const roots: string[] = []
afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })))
})

describe('shell static (T014 / MOH-19)', () => {
  it('serves bot-create assets and rejects path escape', async () => {
    const root = await mkdtemp(join(tmpdir(), 'dsh-shell-'))
    roots.push(root)
    await writeFile(join(root, 'bot-create.html'), '<html>ok</html>\n')
    expect(resolveShellAssetPath('/bot-create.html', root)).toBe(join(root, 'bot-create.html'))
    expect(resolveShellAssetPath('/../secret', root)).toBeUndefined()
    const response = await serveShellStatic(new Request('dsh-app://shell/bot-create.html'), root)
    expect(response.status).toBe(200)
    expect(await response.text()).toContain('ok')
  })
})
