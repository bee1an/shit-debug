import { onMessage, sendMessage } from 'webext-bridge/background'
import type { Tabs } from 'webextension-polyfill'

if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  // load latest content script
  import('./contentScriptHMR')
}

browser.runtime.onInstalled.addListener((): void => {})

let previousTabId = 0

browser.tabs.onActivated.addListener(async ({ tabId }) => {
  if (!previousTabId) {
    previousTabId = tabId
    return
  }

  let tab: Tabs.Tab

  try {
    tab = await browser.tabs.get(previousTabId)
    previousTabId = tabId
  }
  catch {
    return
  }

  sendMessage('tab-prev', { title: tab.title }, { context: 'content-script', tabId })
})

onMessage('get-current-tab', async () => {
  try {
    const tab = await browser.tabs.get(previousTabId)
    return { title: tab?.title }
  }
  catch {
    return { title: undefined }
  }
})

onMessage('get-iframe-session-storage', async () => {
  return { success: false, error: '此功能已移至content script处理' }
})

browser.webRequest.onBeforeSendHeaders.addListener(
  (details) => {
    // 获取请求头
    browser.storage.local.set({
      key_req_host: {
        url: details.url,
        headers: JSON.stringify(details.requestHeaders),
      },
    })
    // 可以在此对请求头进行修改
    return details
  },
  { urls: ['https://cdszzx.tfsmy.com/cbase/bud-cloud-governance-biz/openKey/key*'] },
  ['requestHeaders'],
)
