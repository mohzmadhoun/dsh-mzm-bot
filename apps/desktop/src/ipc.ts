/** Typed preload operations exposed only by the Electron shell. */

import type { IpcMainInvokeEvent } from 'electron'

/** IPC channel names kept private to the desktop application bundle. */
export const DESKTOP_IPC = {
  boot: 'dsh-desktop:boot',
  bootFailed: 'dsh-desktop:boot-failed',
  directoryPick: 'dsh-desktop:directory-pick',
  updatesStatus: 'dsh-desktop:updates-status',
  updatesOpen: 'dsh-desktop:updates-open',
  updatesPresentation: 'dsh-desktop:updates-presentation',
  nativeThemeSet: 'dsh-desktop:native-theme-set',
  windowsAppearance: 'dsh-desktop:windows-appearance',
  windowsMenu: 'dsh-desktop:windows-menu',
  /** T013 / MOH-17: set provider secret in OS-backed store (main only). */
  credentialsSet: 'dsh-desktop:credentials-set',
  /** T013 / MOH-17: remove provider secret from OS-backed store. */
  credentialsUnset: 'dsh-desktop:credentials-unset',
  /** T013 / MOH-17: presence-only credential metadata (never raw secrets). */
  credentialsList: 'dsh-desktop:credentials-list',
  /** T014 / MOH-19: create a bot with model/provider assignment intent. */
  botsCreate: 'dsh-desktop:bots-create',
  /** T014 / MOH-19: list Shell-persisted bots. */
  botsList: 'dsh-desktop:bots-list',
  /** T014 / MOH-19: open the Shell bot-create window. */
  botsOpenCreate: 'dsh-desktop:bots-open-create',
} as const

/** Desktop release update state rendered by desktop-owned UI. */
export type DesktopUpdatePreparationFailureKind = 'stop-failed' | 'tasks-changed' | 'tasks-unavailable'

export interface DesktopUpdateState {
  readonly phase: 'idle' | 'checking' | 'available' | 'downloading' | 'verifying' | 'installing' | 'ready' | 'error'
  readonly version?: string
  readonly message?: string
  /** Main-owned diagnostics without subprocess output or credentials; hidden until expanded. */
  readonly technicalDetails?: string
  readonly percent?: number
  readonly failedOperation?: 'check' | 'download' | 'install'
  /** Main-owned preparation cause; UI wording is selected by the active locale. */
  readonly preparationFailure?: DesktopUpdatePreparationFailureKind
}

/** Classified failure copy selected by the Web locale without exposing raw updater diagnostics. */
export type DesktopUpdateFailureKind =
  | 'check'
  | 'check-network'
  | 'download'
  | 'download-network'
  | 'install'
  | 'install-network'
  | 'stop-failed'
  | 'tasks-changed'
  | 'tasks-unavailable'

/** Semantic status content; actions open main-process confirmation dialogs only. */
export interface DesktopUpdatePresentation {
  readonly phase: DesktopUpdateState['phase']
  readonly version?: string
  readonly percent?: number
  readonly failure?: DesktopUpdateFailureKind
}

/** Product documents cannot supply update versions, package URLs, or installation authorization. */
export interface DshDesktopProductApi {
  readonly protocolVersion: 1
  readonly updates: {
    status(): Promise<DesktopUpdatePresentation>
    open(): Promise<void>
    subscribe(listener: (state: DesktopUpdatePresentation) => void): () => void
  }
}

/** Presence-only credential row; raw secrets never cross this boundary (T013 / MOH-17). */
export interface DesktopCredentialPresence {
  readonly provider: 'gpt' | 'claude' | 'grok' | 'deepseek'
  readonly ref: string
  readonly configured: boolean
  readonly source: 'secure-store' | 'env' | 'absent'
  readonly writable: boolean
}

/** Bot create / list shapes for the Shell create UI (T014 / MOH-19). */
export interface DesktopBotCreateRequest {
  readonly displayName: string
  readonly provider: 'gpt' | 'claude' | 'grok' | 'deepseek'
  readonly modelId: string
}

export interface DesktopBotSummary {
  readonly id: string
  readonly displayName: string
  readonly provider: 'gpt' | 'claude' | 'grok' | 'deepseek'
  readonly modelId: string
  readonly credentialRef: string
  readonly status: 'draft' | 'ready' | 'error'
  readonly createdAt: string
}

/** Narrow preload surface for in-app auth + bot create (no raw secret readout). */
export interface DshDesktopWedgeApi {
  readonly credentials: {
    list(): Promise<readonly DesktopCredentialPresence[]>
    set(provider: DesktopCredentialPresence['provider'], secret: string): Promise<void>
    unset(provider: DesktopCredentialPresence['provider']): Promise<void>
  }
  readonly bots: {
    list(): Promise<readonly DesktopBotSummary[]>
    create(input: DesktopBotCreateRequest): Promise<DesktopBotSummary>
    openCreate(): Promise<void>
  }
}

/** Scheme of Desktop-owned application documents. */
export const SCHEME = 'dsh-app'

/**
 * Reject IPC outside the allowed Desktop document origins.
 * @param event - IPC caller whose frame URL supplies the origin.
 * @param hostnames - Desktop document hosts allowed for this operation.
 */
export function assertDesktopSender(event: IpcMainInvokeEvent, hostnames: readonly string[]): void {
  const senderFrame = event.senderFrame
  if (senderFrame === null) throw new Error('dsh desktop: rejected IPC without a sender frame')
  const url = new URL(senderFrame.url)
  if (url.protocol !== `${SCHEME}:` || !hostnames.includes(url.hostname)) {
    throw new Error('dsh desktop: rejected IPC from an unowned renderer')
  }
}
