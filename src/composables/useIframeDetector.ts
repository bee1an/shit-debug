// Chrome API类型声明
declare const chrome: {
  scripting: {
    executeScript: (params: {
      target: { tabId: number }
      func: () => any
    }) => Promise<Array<{ result: any }>>
  }
}

interface IframeInfo {
  index: number
  src?: string
  hashContent?: string
  sessionStorageData?: any
}

interface IframeDetectionResult {
  count: number
  iframes: IframeInfo[]
}

export function useIframeDetector() {
  const isProcessing = ref(false)
  const message = ref('')
  const copiedContent = ref('')
  const sessionStorageData = ref<any>(null)
  const iframeList = ref<IframeInfo[]>([])
  const selectedIframe = ref<IframeInfo | null>(null)
  async function getIframeInfo(): Promise<IframeDetectionResult> {
    try {
      isProcessing.value = true
      message.value = '正在检测页面中的iframe...'

      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        throw new Error('无法获取当前标签页信息')
      }

      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async () => {
          try {
            const iframes = document.querySelectorAll('iframe')
            const count = iframes.length

            if (count === 0) {
              return { count: 0, iframes: [] }
            }

            const iframeResults: IframeInfo[] = []

            // 获取所有iframe的信息
            for (let i = 0; i < iframes.length; i++) {
              const iframe = iframes[i] as HTMLIFrameElement
              const src = iframe.src || ''

              let hashContent = ''
              if (src && src.includes('#')) {
                try {
                  const url = new URL(src)
                  hashContent = url.hash
                }
                catch {
                  // URL解析失败，跳过hash提取
                }
              }

              let sessionStorageData

              try {
                if (iframe.contentWindow) {
                  sessionStorageData = await new Promise((resolve) => {
                    const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

                    const timeout = setTimeout(() => {
                      // eslint-disable-next-line ts/no-use-before-define
                      window.removeEventListener('message', handleMessage)
                      resolve(undefined)
                    }, 3000)

                    const handleMessage = (event: MessageEvent) => {
                      if (event.data.type === 'iframe_data_response' && event.data.messageId === messageId) {
                        clearTimeout(timeout)
                        window.removeEventListener('message', handleMessage)

                        const response = event.data.data?.sessionStorageData
                        if (response) {
                          try {
                            resolve(JSON.parse(response))
                          }
                          catch {
                            resolve(response)
                          }
                        }
                        else {
                          resolve(undefined)
                        }
                      }
                    }

                    window.addEventListener('message', handleMessage)

                    iframe.contentWindow?.postMessage({
                      type: 'request_iframe_data',
                      messageId,
                      requiredKeys: ['SET_LOGIN_DATA'],
                    }, '*')
                  })
                }
              }
              catch {
                // 获取iframe sessionStorage失败
              }

              iframeResults.push({
                index: i,
                src,
                hashContent: hashContent || undefined,
                sessionStorageData: sessionStorageData || undefined,
              })
            }

            return {
              count,
              iframes: iframeResults,
            }
          }
          catch {
            return { count: 0, iframes: [] }
          }
        },
      })

      return (result.result as IframeDetectionResult) || { count: 0, iframes: [] }
    }
    catch (error) {
      throw new Error(error instanceof Error ? error.message : '未知错误')
    }
    finally {
      isProcessing.value = false
    }
  }

  async function copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      copiedContent.value = text
      message.value = '已复制到剪切板'

      await browser.storage.local.set({
        lastCopiedContent: text,
        copyTime: new Date().toISOString(),
      })
    }
    catch {
      throw new Error('复制到剪切板失败')
    }
  }
  async function handleIframeDetection(): Promise<void> {
    try {
      message.value = ''
      iframeList.value = []
      selectedIframe.value = null

      const iframeResult = await getIframeInfo()

      if (iframeResult.count === 0) {
        message.value = '当前页面没有找到iframe'
        sessionStorageData.value = null
        return
      }

      iframeList.value = iframeResult.iframes

      if (iframeResult.count === 1) {
        // 单个iframe直接处理
        const iframe = iframeResult.iframes[0]
        selectedIframe.value = iframe
        sessionStorageData.value = iframe.sessionStorageData || null

        if (iframe.hashContent) {
          await copyToClipboard(iframe.hashContent)
          message.value = '成功获取iframe数据并复制内容到剪切板'
        }
        else {
          message.value = 'iframe链接不是hash路由'
        }

        if (!iframe.sessionStorageData) {
          message.value += ' (未找到SET_LOGIN_DATA数据)'
        }
      }
      else {
        // 多个iframe，显示列表等待用户选择
        message.value = `找到 ${iframeResult.count} 个iframe，请选择其中一个`
      }
    }
    catch (error) {
      message.value = error instanceof Error ? error.message : '操作失败'
      sessionStorageData.value = null
      iframeList.value = []
      selectedIframe.value = null
    }
  }

  async function selectIframe(iframe: IframeInfo): Promise<void> {
    try {
      selectedIframe.value = iframe
      sessionStorageData.value = iframe.sessionStorageData || null

      if (iframe.hashContent) {
        await copyToClipboard(iframe.hashContent)
        message.value = '成功获取iframe数据并复制内容到剪切板'
      }
      else {
        message.value = 'iframe链接不是hash路由'
      }

      if (!iframe.sessionStorageData) {
        message.value += ' (未找到SET_LOGIN_DATA数据)'
      }
    }
    catch (error) {
      message.value = error instanceof Error ? error.message : '操作失败'
    }
  }

  return {
    isProcessing,
    message,
    copiedContent,
    sessionStorageData,
    iframeList,
    selectedIframe,
    handleIframeDetection,
    selectIframe,
    copyToClipboard,
  }
}
