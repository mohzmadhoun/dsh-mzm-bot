/**
 * Main-process IPC for in-app auth (T013 / MOH-17) and bot create (T014 / MOH-19).
 * Raw secrets enter only as set() arguments and never return to the renderer.
 */

import { BrowserWindow, ipcMain, type IpcMainInvokeEvent } from 'electron'
import { BotRegistry, type DesktopBotRecord } from './bot-registry.ts'
import {
  DESKTOP_IPC,
  SCHEME,
  assertDesktopSender,
  type DesktopBotCreateRequest,
  type DesktopBotSummary,
  type DesktopCredentialPresence,
} from './ipc.ts'
import { SecureCredentialStore } from './secure-credential-store.ts'
import { credentialRefNameForProvider, isWedgeProviderId, type WedgeProviderId } from './wedge-providers.ts'

const WEDGE_SENDERS = ['app', 'shell'] as const

function toSummary(bot: DesktopBotRecord): DesktopBotSummary {
  return {
    id: bot.id,
    displayName: bot.displayName,
    provider: bot.provider,
    modelId: bot.modelId,
    credentialRef: bot.credentialRef,
    status: bot.status,
    createdAt: bot.createdAt,
  }
}

function parseProvider(value: unknown): WedgeProviderId {
  if (typeof value !== 'string' || !isWedgeProviderId(value)) {
    throw new Error('dsh desktop: provider must be one of gpt|claude|grok|deepseek')
  }
  return value
}

/**
 * Register wedge IPC handlers and Shell bot-create window opener.
 * @param store - OS-backed credential vault.
 * @param bots - Shell bot registry.
 * @param preloadPath - Absolute path to the app preload (contextIsolation + sandbox).
 * @param parent - Parent window for the create UI, when available.
 */
export function installDesktopWedgeIpc(
  store: SecureCredentialStore,
  bots: BotRegistry,
  preloadPath: string,
  parent: () => BrowserWindow | undefined,
): void {
  ipcMain.handle(DESKTOP_IPC.credentialsList, async (event: IpcMainInvokeEvent) => {
    assertDesktopSender(event, WEDGE_SENDERS)
    const rows = await store.listProviderPresence()
    return rows.map((row): DesktopCredentialPresence => ({
      provider: row.provider,
      ref: row.ref,
      configured: row.configured,
      source: row.source,
      writable: row.writable,
    }))
  })

  ipcMain.handle(DESKTOP_IPC.credentialsSet, async (event: IpcMainInvokeEvent, providerRaw: unknown, secretRaw: unknown) => {
    assertDesktopSender(event, WEDGE_SENDERS)
    const provider = parseProvider(providerRaw)
    if (typeof secretRaw !== 'string' || secretRaw.length === 0) {
      throw new Error('dsh desktop: credential secret must be a non-empty string')
    }
    await store.set(credentialRefNameForProvider(provider), secretRaw)
  })

  ipcMain.handle(DESKTOP_IPC.credentialsUnset, async (event: IpcMainInvokeEvent, providerRaw: unknown) => {
    assertDesktopSender(event, WEDGE_SENDERS)
    await store.unset(credentialRefNameForProvider(parseProvider(providerRaw)))
  })

  ipcMain.handle(DESKTOP_IPC.botsList, async (event: IpcMainInvokeEvent) => {
    assertDesktopSender(event, WEDGE_SENDERS)
    return (await bots.list()).map(toSummary)
  })

  ipcMain.handle(DESKTOP_IPC.botsCreate, async (event: IpcMainInvokeEvent, input: unknown) => {
    assertDesktopSender(event, WEDGE_SENDERS)
    if (typeof input !== 'object' || input === null) throw new Error('dsh desktop: bot create requires an object')
    return toSummary(await bots.create(input as DesktopBotCreateRequest))
  })

  ipcMain.handle(DESKTOP_IPC.botsOpenCreate, async (event: IpcMainInvokeEvent) => {
    assertDesktopSender(event, WEDGE_SENDERS)
    openBotCreateWindow(preloadPath, parent())
  })
}

let createWindow: BrowserWindow | undefined

/**
 * Open (or focus) the Shell-owned bot create document.
 * Uses dsh-app://shell/ — local shell page, not Host HTTP / loopback app bus.
 */
export function openBotCreateWindow(preloadPath: string, parentWindow: BrowserWindow | undefined): void {
  if (createWindow !== undefined && !createWindow.isDestroyed()) {
    createWindow.focus()
    return
  }
  const window = new BrowserWindow({
    width: 520,
    height: 640,
    ...(parentWindow === undefined || parentWindow.isDestroyed() ? {} : { parent: parentWindow }),
    title: 'Create bot',
    autoHideMenuBar: true,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: false,
    },
  })
  createWindow = window
  window.once('closed', () => { if (createWindow === window) createWindow = undefined })
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
  window.webContents.on('will-navigate', (navigationEvent, url) => {
    if (url !== `${SCHEME}://shell/bot-create.html`) navigationEvent.preventDefault()
  })
  void window.loadURL(`${SCHEME}://shell/bot-create.html`)
}

/** Detach wedge IPC handlers (tests / shutdown). */
export function uninstallDesktopWedgeIpc(): void {
  for (const channel of [
    DESKTOP_IPC.credentialsList,
    DESKTOP_IPC.credentialsSet,
    DESKTOP_IPC.credentialsUnset,
    DESKTOP_IPC.botsList,
    DESKTOP_IPC.botsCreate,
    DESKTOP_IPC.botsOpenCreate,
  ]) {
    ipcMain.removeHandler(channel)
  }
  if (createWindow !== undefined && !createWindow.isDestroyed()) createWindow.destroy()
  createWindow = undefined
}
