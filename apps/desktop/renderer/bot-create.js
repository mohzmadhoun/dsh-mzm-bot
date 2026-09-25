/** Basic Shell bot-create page (T014 / MOH-19). Uses preload wedge API only. */

const wedge = globalThis.dshDesktopWedge

const form = document.getElementById('create-form')
const list = document.getElementById('bot-list')
const error = document.getElementById('form-error')
const credentialStatus = document.getElementById('credential-status')
const providerSelect = document.getElementById('provider')
const apiKeyInput = document.getElementById('api-key')

function showError(message) {
  error.hidden = !message
  error.textContent = message || ''
}

async function refreshCredentials() {
  if (!wedge) {
    credentialStatus.textContent = 'Desktop wedge API unavailable.'
    return
  }
  const rows = await wedge.credentials.list()
  const provider = providerSelect.value
  const row = rows.find((item) => item.provider === provider)
  if (row?.configured) {
    credentialStatus.textContent = `Credential for ${provider}: configured (${row.source}).`
  } else {
    credentialStatus.textContent = `Credential for ${provider}: not configured — paste a key to store it in the OS secure store.`
  }
}

async function refreshBots() {
  if (!wedge) {
    list.innerHTML = '<li>Desktop wedge API unavailable.</li>'
    return
  }
  const bots = await wedge.bots.list()
  if (bots.length === 0) {
    list.innerHTML = '<li><span>No bots yet — create at least two with different providers.</span></li>'
    return
  }
  list.innerHTML = bots.map((bot) => (
    `<li>`
    + `<strong>${escapeHtml(bot.displayName)}</strong>`
    + `<span>${escapeHtml(bot.provider)} · ${escapeHtml(bot.modelId)} · ${escapeHtml(bot.status)}</span>`
    + `<span>credentialRef: ${escapeHtml(bot.credentialRef)}</span>`
    + `</li>`
  )).join('')
}

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

providerSelect.addEventListener('change', () => { void refreshCredentials() })

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  showError('')
  if (!wedge) {
    showError('Desktop wedge API unavailable.')
    return
  }
  const displayName = document.getElementById('display-name').value.trim()
  const provider = providerSelect.value
  const modelId = document.getElementById('model-id').value.trim()
  const secret = apiKeyInput.value
  try {
    if (secret.length > 0) {
      await wedge.credentials.set(provider, secret)
      apiKeyInput.value = ''
    }
    await wedge.bots.create({ displayName, provider, modelId })
    await refreshCredentials()
    await refreshBots()
    form.reset()
    providerSelect.value = provider
  } catch (failure) {
    showError(failure instanceof Error ? failure.message : String(failure))
  }
})

void (async () => {
  await refreshCredentials()
  await refreshBots()
})()
