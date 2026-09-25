/** Origin-scoped boot, native directory selection, update presentation, and wedge auth/bot create APIs. */

import { contextBridge, ipcRenderer } from 'electron'
import {
  DESKTOP_IPC,
  SCHEME,
  type DshDesktopProductApi,
  type DshDesktopWedgeApi,
  type DesktopUpdatePresentation,
} from './ipc.ts'
import { markDocumentPlatform } from './preload-platform.ts'
import { syncNativeTheme } from './preload-theme.ts'
import { syncWindowsAppearance } from './preload-windows.ts'

const product: DshDesktopProductApi = {
  protocolVersion: 1,
  updates: {
    status: () => ipcRenderer.invoke(DESKTOP_IPC.updatesStatus) as Promise<DesktopUpdatePresentation>,
    open: () => ipcRenderer.invoke(DESKTOP_IPC.updatesOpen) as Promise<void>,
    subscribe(listener) {
      const handle = (_event: Electron.IpcRendererEvent, state: DesktopUpdatePresentation): void => { listener(state) }
      ipcRenderer.on(DESKTOP_IPC.updatesPresentation, handle)
      return () => { ipcRenderer.off(DESKTOP_IPC.updatesPresentation, handle) }
    },
  },
}

const wedge: DshDesktopWedgeApi = {
  credentials: {
    list: () => ipcRenderer.invoke(DESKTOP_IPC.credentialsList) as ReturnType<DshDesktopWedgeApi['credentials']['list']>,
    set: (provider, secret) => ipcRenderer.invoke(DESKTOP_IPC.credentialsSet, provider, secret) as Promise<void>,
    unset: provider => ipcRenderer.invoke(DESKTOP_IPC.credentialsUnset, provider) as Promise<void>,
  },
  bots: {
    list: () => ipcRenderer.invoke(DESKTOP_IPC.botsList) as ReturnType<DshDesktopWedgeApi['bots']['list']>,
    create: input => ipcRenderer.invoke(DESKTOP_IPC.botsCreate, input) as ReturnType<DshDesktopWedgeApi['bots']['create']>,
    openCreate: () => ipcRenderer.invoke(DESKTOP_IPC.botsOpenCreate) as Promise<void>,
  },
}

const onApp = location.protocol === `${SCHEME}:` && location.hostname === 'app'
const onShell = location.protocol === `${SCHEME}:` && location.hostname === 'shell'

if (onApp) {
  syncWindowsAppearance()
  contextBridge.exposeInMainWorld('__DSH_DIRECTORY_PICKER__', {
    pick: () => ipcRenderer.invoke(DESKTOP_IPC.directoryPick) as Promise<string | null>,
  })
  contextBridge.exposeInMainWorld('dshDesktopBoot', {
    ready: () => ipcRenderer.invoke(DESKTOP_IPC.boot) as Promise<unknown>,
    failed: (message: string) => ipcRenderer.invoke(DESKTOP_IPC.bootFailed, message) as Promise<void>,
  })
}

markDocumentPlatform()
syncNativeTheme()
// Main-process IPC also verifies the owning window and top frame.
contextBridge.exposeInMainWorld('dshDesktop', onApp ? product : { protocolVersion: 1 })
// Narrow wedge surface: app + shell documents only; never exposes raw secret readout.
if (onApp || onShell) {
  contextBridge.exposeInMainWorld('dshDesktopWedge', wedge)
}
