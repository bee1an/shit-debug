import { onMessage, sendMessage } from 'webext-bridge/background'
import type { Tabs } from 'webextension-polyfill'

if (import.meta.hot) {
  // @ts-expect-error for background HMR
  import('/@vite/client')
  // load latest content script
  import('./contentScriptHMR')
}

browser.runtime.onInstalled.addListener((): void => {
  // 设置点击扩展图标时打开 sidepanel
  const browserAny = browser as any
  if (browserAny.sidePanel) {
    browserAny.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
  }
})

// 点击扩展图标时打开 sidepanel (备用方案)
browser.action.onClicked.addListener(async (tab) => {
  const browserAny = browser as any
  if (browserAny.sidePanel && tab.id) {
    await browserAny.sidePanel.open({ tabId: tab.id })
  }
})

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

// API文档提取相关
interface ExtractedDoc {
  title: string
  content: string
  url: string
}

interface ExtractionProgress {
  current: number
  total: number
  currentTitle: string
  status: 'idle' | 'selecting' | 'extracting' | 'done' | 'error'
  docs: ExtractedDoc[]
  error?: string
}

// 存储提取进度
let extractionProgress: ExtractionProgress = {
  current: 0,
  total: 0,
  currentTitle: '',
  status: 'idle',
  docs: [],
}

// 监听来自content script的提取请求
browser.runtime.onMessage.addListener((message: any, _sender, sendResponse) => {
  if (message.type === 'START_API_DOC_EXTRACTION') {
    handleApiDocExtraction(message.links)
    sendResponse({ success: true })
    return undefined
  }
  else if (message.type === 'GET_EXTRACTION_PROGRESS') {
    sendResponse(extractionProgress)
    return undefined
  }
  return undefined
})

// 处理API文档提取 - 只收集链接信息，不立即下载
async function handleApiDocExtraction(links: { title: string, href: string }[]) {
  // 直接将所有链接信息存储，不下载
  const docs: ExtractedDoc[] = links.map(link => ({
    title: link.title,
    content: '', // 不需要内容，下载时直接用 URL
    url: link.href,
  }))

  extractionProgress = {
    current: links.length,
    total: links.length,
    currentTitle: '',
    status: 'done',
    docs,
  }

  // 通知sidepanel显示结果
  notifySidepanel()
}

// 通知sidepanel更新进度
function notifySidepanel() {
  browser.runtime.sendMessage({
    type: 'EXTRACTION_PROGRESS_UPDATE',
    progress: extractionProgress,
  }).catch(() => {
    // sidepanel可能未打开，忽略错误
  })
}
