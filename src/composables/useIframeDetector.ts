import { ref } from 'vue'
import { type OpenKeyParseResult, getAndParseOpenKey, hasValidOpenKeyConfig, replaceOpenKeyInUrl } from '~/utils/openKey'

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
  openKeyResult?: OpenKeyParseResult
  updatedUrl?: string
}

interface IframeDetectionResult {
  count: number
  iframes: IframeInfo[]
}

export function useIframeDetector() {
  const isProcessing = ref(false)
  const message = ref('')
  const copiedContent = ref('')
  const iframeList = ref<IframeInfo[]>([])
  const selectedIframe = ref<IframeInfo | null>(null)

  /**
   * 处理单个iframe的openKey获取和URL替换
   * @param iframe 原始iframe信息
   * @param iframe.index iframe序号
   * @param iframe.src iframe的src属性
   * @param iframe.hashContent iframe的hash内容
   * @param maxRetries 最大重试次数，默认3次
   * @returns Promise<IframeInfo> 处理结果
   */
  async function processIframeWithOpenKey(iframe: { index: number, src?: string, hashContent?: string }, maxRetries = 3): Promise<IframeInfo> {
    const processedIframe: IframeInfo = {
      index: iframe.index,
      src: iframe.src,
      hashContent: iframe.hashContent,
    }

    let openKeyResult: OpenKeyParseResult | null = null
    let lastError: string | null = null

    // 重试获取openKey
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        openKeyResult = await getAndParseOpenKey()
        processedIframe.openKeyResult = openKeyResult

        if (openKeyResult.success && openKeyResult.data?.result.openKey && iframe.hashContent) {
          try {
            const baseUrl = `http://localhost:4000${iframe.hashContent}`
            const updatedUrl = replaceOpenKeyInUrl(baseUrl, openKeyResult.data.result.openKey)
            processedIframe.updatedUrl = updatedUrl
            break // 成功则跳出循环
          }
          catch (error) {
            lastError = error instanceof Error ? error.message : 'URL替换失败'
            console.error('URL替换失败:', error)
          }
        }
        else {
          lastError = openKeyResult?.error || 'OpenKey获取失败'
        }
      }
      catch (error) {
        lastError = error instanceof Error ? error.message : 'OpenKey获取异常'
        console.error(`OpenKey获取失败 (尝试 ${attempt}/${maxRetries}):`, error)
      }

      // 如果不是最后一次尝试，等待一下再重试
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)) // 递增延迟：1s, 2s, 3s
      }
    }

    // 如果所有重试都失败了，设置错误信息
    if (!openKeyResult?.success && lastError) {
      processedIframe.openKeyResult = {
        success: false,
        error: `重试${maxRetries}次后仍然失败: ${lastError}`,
      }
    }

    return processedIframe
  }

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

            const iframeResults: { index: number, src?: string, hashContent?: string }[] = []

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

              iframeResults.push({
                index: i,
                src,
                hashContent: hashContent || undefined,
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

      const basicResult = result.result as IframeDetectionResult || { count: 0, iframes: [] }

      // 为每个iframe处理openKey
      const processedIframes: IframeInfo[] = []
      for (const iframe of basicResult.iframes) {
        const processedIframe = await processIframeWithOpenKey(iframe)
        processedIframes.push(processedIframe)
      }

      return {
        count: basicResult.count,
        iframes: processedIframes,
      }
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

      // 检查是否有有效的openKey配置
      const hasConfig = await hasValidOpenKeyConfig()
      if (!hasConfig) {
        message.value = '未找到有效的OpenKey配置，请先访问目标页面'
        return
      }

      const iframeResult = await getIframeInfo()

      if (iframeResult.count === 0) {
        message.value = '当前页面没有找到iframe'
        return
      }

      iframeList.value = iframeResult.iframes

      if (iframeResult.count === 1) {
        // 单个iframe直接处理
        const iframe = iframeResult.iframes[0]
        selectedIframe.value = iframe

        if (iframe.updatedUrl) {
          await copyToClipboard(iframe.updatedUrl)
          message.value = '成功获取openKey并更新URL，已复制到剪切板'
        }
        else if (iframe.hashContent) {
          await copyToClipboard(iframe.hashContent)
          message.value = '成功获取iframe内容，但openKey获取失败'
        }
        else {
          message.value = 'iframe链接不是hash路由'
        }

        if (!iframe.openKeyResult?.success) {
          const errorMsg = iframe.openKeyResult?.error || '未知错误'
          message.value += ` (openKey获取失败: ${errorMsg})`
        }
      }
      else {
        // 多个iframe，显示列表等待用户选择
        message.value = `找到 ${iframeResult.count} 个iframe，请选择其中一个`
      }
    }
    catch (error) {
      message.value = error instanceof Error ? error.message : '操作失败'
      iframeList.value = []
      selectedIframe.value = null
    }
  }

  async function selectIframe(iframe: IframeInfo): Promise<void> {
    try {
      selectedIframe.value = iframe

      if (iframe.updatedUrl) {
        await copyToClipboard(iframe.updatedUrl)
        message.value = '成功获取openKey并更新URL，已复制到剪切板'
      }
      else if (iframe.hashContent) {
        await copyToClipboard(iframe.hashContent)
        message.value = '成功获取iframe内容，但openKey获取失败'
      }
      else {
        message.value = 'iframe链接不是hash路由'
      }

      if (!iframe.openKeyResult?.success) {
        const errorMsg = iframe.openKeyResult?.error || '未知错误'
        message.value += ` (openKey获取失败: ${errorMsg})`
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
    iframeList,
    selectedIframe,
    handleIframeDetection,
    selectIframe,
    copyToClipboard,
  }
}
