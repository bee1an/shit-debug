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
  count: number
  src?: string
  hashContent?: string
  sessionStorageData?: any
}

export function useIframeDetector() {
  const isProcessing = ref(false)
  const message = ref('')
  const copiedContent = ref('')
  const sessionStorageData = ref<any>(null)
  async function getIframeInfo(): Promise<IframeInfo> {
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
              return { count: 0 }
            }

            if (count > 1) {
              return { count }
            }

            const iframe = iframes[0] as HTMLIFrameElement
            const src = iframe.src || ''

            let hashContent = ''
            if (src && src.includes('#')) {
              const url = new URL(src)
              hashContent = url.hash
            }

            let sessionStorageData

            try {
              if (!sessionStorageData && iframe.contentWindow) {
                sessionStorageData = await new Promise((resolve) => {
                  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
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

                  const timeout = setTimeout(() => {
                    window.removeEventListener('message', handleMessage)
                    resolve(undefined)
                  }, 3000)

                  window.addEventListener('message', handleMessage)

                  iframe.contentWindow?.postMessage({
                    type: 'request_iframe_data',
                    messageId,
                    requiredKeys: ['SET_LOGIN_DATA'],
                  }, '*')
                })
              }
            }
            catch (error) {
              // 获取iframe sessionStorage失败
            }

            return {
              count: 1,
              src,
              hashContent: hashContent || undefined,
              sessionStorageData: sessionStorageData || undefined,
            }
          }
          catch (error) {
            return { count: 0 }
          }
        },
      })

      return (result.result as IframeInfo) || { count: 0 }
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
    catch (error) {
      throw new Error('复制到剪切板失败')
    }
  }
  async function handleIframeDetection(): Promise<void> {
    try {
      message.value = ''

      const iframeInfo = await getIframeInfo()

      if (iframeInfo.count === 0) {
        message.value = '当前页面没有找到iframe'
        sessionStorageData.value = null
        return
      }

      if (iframeInfo.count > 1) {
        message.value = `找到 ${iframeInfo.count} 个iframe，请处理只有一个iframe的页面`
        sessionStorageData.value = null
        return
      }

      if (iframeInfo.src) {
        sessionStorageData.value = iframeInfo.sessionStorageData || null

        if (iframeInfo.hashContent) {
          await copyToClipboard(iframeInfo.hashContent)
        }
        else {
          message.value = 'iframe链接不是hash路由'
        }

        if (iframeInfo.sessionStorageData) {
          message.value = '成功获取iframe数据并复制内容到剪切板'
        }
        else {
          message.value += ' (未找到SET_LOGIN_DATA数据)'
        }
      }
      else {
        message.value = '无法获取iframe的src属性'
        sessionStorageData.value = null
      }
    }
    catch (error) {
      message.value = error instanceof Error ? error.message : '操作失败'
      sessionStorageData.value = null
    }
  }

  return {
    isProcessing: readonly(isProcessing),
    message: readonly(message),
    copiedContent: readonly(copiedContent),
    sessionStorageData: readonly(sessionStorageData),
    handleIframeDetection,
    copyToClipboard,
  }
}
