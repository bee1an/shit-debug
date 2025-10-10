/**
 * iframe检测和处理相关的Composable
 */

// 为Chrome API添加类型声明
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
}

export function useIframeDetector() {
  const isProcessing = ref(false)
  const message = ref('')

  /**
   * 获取当前页面的iframe信息
   */
  async function getIframeInfo(): Promise<IframeInfo> {
    try {
      isProcessing.value = true
      message.value = '正在检测页面中的iframe...'

      // 获取当前活动标签页
      const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

      if (!tab.id) {
        throw new Error('无法获取当前标签页信息')
      }

      // 使用chrome.scripting.executeScript直接在页面中执行代码
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          try {
            // 获取页面中的所有iframe
            const iframes = document.querySelectorAll('iframe')
            const count = iframes.length

            if (count === 0) {
              return { count: 0 }
            }

            if (count > 1) {
              return { count }
            }

            // 只有一个iframe的情况
            const iframe = iframes[0] as HTMLIFrameElement
            const src = iframe.src || ''

            let hashContent = ''
            if (src && src.includes('#')) {
              const url = new URL(src)
              hashContent = url.hash.slice(1) // 去掉#号
            }

            return {
              count: 1,
              src,
              hashContent: hashContent || undefined,
            }
          }
          catch (error) {
            console.error('Error getting iframe info:', error)
            return { count: 0 }
          }
        },
      })

      return (result.result as IframeInfo) || { count: 0 }
    }
    catch (error) {
      console.error('获取iframe信息失败:', error)
      throw new Error(error instanceof Error ? error.message : '未知错误')
    }
    finally {
      isProcessing.value = false
    }
  }

  /**
   * 复制文本到剪切板
   */
  async function copyToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text)
      message.value = '已复制到剪切板'
    }
    catch (error) {
      console.error('复制失败:', error)
      throw new Error('复制到剪切板失败')
    }
  }

  /**
   * 处理iframe检测的主要逻辑
   */
  async function handleIframeDetection(): Promise<void> {
    try {
      message.value = ''

      const iframeInfo = await getIframeInfo()

      if (iframeInfo.count === 0) {
        message.value = '当前页面没有找到iframe'
        return
      }

      if (iframeInfo.count > 1) {
        message.value = `找到 ${iframeInfo.count} 个iframe，请处理只有一个iframe的页面`
        return
      }

      // 只有一个iframe的情况
      if (iframeInfo.src) {
        if (iframeInfo.hashContent) {
          await copyToClipboard(iframeInfo.hashContent)
        }
        else {
          message.value = 'iframe链接不是hash路由'
        }
      }
      else {
        message.value = '无法获取iframe的src属性'
      }
    }
    catch (error) {
      message.value = error instanceof Error ? error.message : '操作失败'
    }
  }

  return {
    isProcessing: readonly(isProcessing),
    message: readonly(message),
    handleIframeDetection,
    copyToClipboard,
  }
}
