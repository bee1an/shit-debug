import { ref } from 'vue'
import { usePopupSettings } from './usePopupSettings'
import { type OpenKeyParseResult, getAndParseOpenKey, hasValidOpenKeyConfig, replaceOpenKeyInUrl } from '~/utils/openKey'

export interface IframeInfo {
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
  const iframeList = ref<IframeInfo[]>([])
  const selectedIframe = ref<IframeInfo | null>(null)

  // 使用设置管理composable
  const { buildUrl } = usePopupSettings()

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
            const baseUrl = buildUrl(iframe.hashContent)
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

      // 在所有 frame 中执行脚本，获取每个 frame 的 document.location
      const results = await browser.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        func: () => {
          try {
            // 返回当前 frame 的 location 信息
            const href = window.location.href
            const hash = window.location.hash
            const isTopFrame = window === window.top

            return {
              href,
              hash,
              isTopFrame,
            }
          }
          catch {
            return null
          }
        },
      })

      // 按 frameId 排序，确保顺序一致（frameId 较小的通常是较早创建的 frame）
      const sortedResults = [...results].sort((a, b) => (a.frameId ?? 0) - (b.frameId ?? 0))

      // 过滤掉顶层 frame 和无效结果，只保留 iframe 内部的 document
      const iframeResults: { index: number, src?: string, hashContent?: string }[] = []

      let frameIndex = 0
      for (const result of sortedResults) {
        const frameInfo = result.result as { href: string, hash: string, isTopFrame: boolean } | null

        // 跳过顶层 frame 和无效结果
        if (!frameInfo || frameInfo.isTopFrame) {
          continue
        }

        iframeResults.push({
          index: frameIndex,
          src: frameInfo.href,
          hashContent: frameInfo.hash || undefined,
        })
        frameIndex++
      }

      const count = iframeResults.length

      if (count === 0) {
        return { count: 0, iframes: [] }
      }

      // 为每个iframe处理openKey
      const processedIframes: IframeInfo[] = []
      for (const iframe of iframeResults) {
        const processedIframe = await processIframeWithOpenKey(iframe)
        processedIframes.push(processedIframe)
      }

      return {
        count,
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
    iframeList,
    selectedIframe,
    handleIframeDetection,
    selectIframe,
    copyToClipboard,
  }
}
