/**
 * API文档提取器
 * 用于选择ul/li元素，提取所有叶子li中的a标签链接对应的页面内容
 */

class ApiDocExtractor {
  private isSelecting = false
  private overlay: HTMLElement | null = null
  private boundMouseOver: (e: MouseEvent) => void
  private boundClick: (e: MouseEvent) => void
  private boundMouseOut: (e: MouseEvent) => void

  constructor() {
    this.boundMouseOver = this.handleMouseOver.bind(this)
    this.boundMouseOut = this.handleMouseOut.bind(this)
    this.boundClick = this.handleClick.bind(this)

    this.setupMessageListener()
  }

  private setupMessageListener() {
    const runtime = (window as any).browser?.runtime || (window as any).chrome?.runtime

    if (runtime) {
      runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
        if (message.type === 'TOGGLE_API_DOC_EXTRACT') {
          // Support explicit target state or toggle
          const targetState = message.active !== undefined ? message.active : !this.isSelecting
          this.setSelectionMode(targetState)
          sendResponse({ success: true, active: this.isSelecting })
        }
        else if (message.type === 'EXTRACT_PAGE_CONTENT') {
          // 在目标页面中提取内容
          this.extractCurrentPageContent().then((result) => {
            sendResponse(result)
          })
          return true // 异步响应
        }
        return false
      })
    }
  }

  private setSelectionMode(active: boolean) {
    if (this.isSelecting === active)
      return

    this.isSelecting = active

    if (this.isSelecting) {
      this.enableSelection()
      this.showToast('请点击要提取的 ul 或 li 元素 (再次点击图标退出)')
    }
    else {
      this.disableSelection()
      // Notify sidepanel about state change
      this.notifyStateChange(false)
    }
  }

  /**
   * Notify sidepanel about API extract state change
   */
  private notifyStateChange(active: boolean) {
    const runtime = (window as any).browser?.runtime || (window as any).chrome?.runtime
    if (runtime) {
      runtime.sendMessage({
        type: 'API_EXTRACT_STATE_CHANGED',
        active,
      }).catch(() => {
        // Ignore errors (e.g., no listener)
      })
    }
  }

  private enableSelection() {
    document.body.style.cursor = 'crosshair'
    document.addEventListener('mouseover', this.boundMouseOver, true)
    document.addEventListener('mouseout', this.boundMouseOut, true)
    document.addEventListener('click', this.boundClick, true)
  }

  private disableSelection() {
    document.body.style.cursor = ''
    document.removeEventListener('mouseover', this.boundMouseOver, true)
    document.removeEventListener('mouseout', this.boundMouseOut, true)
    document.removeEventListener('click', this.boundClick, true)
    this.removeOverlay()
  }

  private handleMouseOver(e: MouseEvent) {
    const target = e.target as HTMLElement
    const tagName = target.tagName.toLowerCase()

    // 只高亮 ul 或 li 元素
    if (tagName !== 'ul' && tagName !== 'li') {
      // 尝试找到最近的 ul 或 li 父元素
      const closestUlOrLi = target.closest('ul, li') as HTMLElement
      if (closestUlOrLi) {
        e.preventDefault()
        e.stopPropagation()
        this.highlightElement(closestUlOrLi)
      }
      else {
        this.removeOverlay()
      }
      return
    }

    e.preventDefault()
    e.stopPropagation()
    this.highlightElement(target)
  }

  private handleMouseOut(e: MouseEvent) {
    if (!e.relatedTarget) {
      this.removeOverlay()
    }
  }

  private highlightElement(element: HTMLElement) {
    if (!this.overlay) {
      this.overlay = document.createElement('div')
      this.overlay.style.position = 'absolute'
      this.overlay.style.border = '2px solid #10B981'
      this.overlay.style.backgroundColor = 'rgba(16, 185, 129, 0.1)'
      this.overlay.style.pointerEvents = 'none'
      this.overlay.style.zIndex = '9999999'
      this.overlay.style.transition = 'all 0.1s ease'
      document.body.appendChild(this.overlay)
    }

    const rect = element.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    this.overlay.style.top = `${scrollY + rect.top}px`
    this.overlay.style.left = `${scrollX + rect.left}px`
    this.overlay.style.width = `${rect.width}px`
    this.overlay.style.height = `${rect.height}px`
  }

  private removeOverlay() {
    if (this.overlay) {
      this.overlay.remove()
      this.overlay = null
    }
  }

  private async handleClick(e: MouseEvent) {
    const target = e.target as HTMLElement

    e.preventDefault()
    e.stopPropagation()

    // 退出选择模式
    this.setSelectionMode(false)

    // 找到实际的 ul 或 li 元素
    let targetElement = target
    const tagName = target.tagName.toLowerCase()
    if (tagName !== 'ul' && tagName !== 'li') {
      targetElement = target.closest('ul, li') as HTMLElement
    }

    if (!targetElement) {
      this.showToast('未找到有效的 ul 或 li 元素')
      return
    }

    // 提取所有叶子li
    const leafLis = this.getLeafLis(targetElement)

    if (leafLis.length === 0) {
      this.showToast('未找到包含链接的叶子 li 元素')
      return
    }

    // 提取所有a标签信息
    const links: { title: string, href: string }[] = []
    for (const li of leafLis) {
      const anchor = li.querySelector('a') as HTMLAnchorElement
      if (anchor && anchor.href) {
        links.push({
          title: anchor.textContent?.trim() || 'Untitled',
          href: anchor.href,
        })
      }
    }

    if (links.length === 0) {
      this.showToast('未找到有效的链接')
      return
    }

    this.showToast(`找到 ${links.length} 个链接，开始提取...`)

    // 发送消息给 background 开始提取流程
    const runtime = (window as any).browser?.runtime || (window as any).chrome?.runtime
    if (runtime) {
      runtime.sendMessage({
        type: 'START_API_DOC_EXTRACTION',
        links,
      })
    }
  }

  /**
   * 获取所有叶子li（不包含嵌套ul的li）
   */
  private getLeafLis(element: HTMLElement): HTMLLIElement[] {
    const tagName = element.tagName.toLowerCase()
    const leafLis: HTMLLIElement[] = []

    if (tagName === 'li') {
      // 检查是否为叶子li（不包含子ul）
      const hasNestedUl = element.querySelector('ul') !== null
      if (!hasNestedUl) {
        // 确保包含a标签
        if (element.querySelector('a')) {
          leafLis.push(element as HTMLLIElement)
        }
      }
      else {
        // 递归查找嵌套ul中的叶子li
        const nestedUl = element.querySelector('ul')
        if (nestedUl) {
          leafLis.push(...this.getLeafLis(nestedUl as HTMLElement))
        }
      }
    }
    else if (tagName === 'ul') {
      // 遍历所有直接子li
      const directLis = element.querySelectorAll(':scope > li')
      for (const li of directLis) {
        leafLis.push(...this.getLeafLis(li as HTMLElement))
      }
    }

    return leafLis
  }

  /**
   * 在当前页面中提取内容（点击"复制页面"按钮并拦截剪切板写入）
   */
  private async extractCurrentPageContent(): Promise<{ success: boolean, content?: string, error?: string }> {
    try {
      // 等待按钮可点击
      const button = await this.waitForButton(30000) // 30秒超时
      if (!button) {
        return { success: false, error: '未找到复制页面按钮' }
      }

      // 创建一个 Promise 来捕获剪切板写入
      const capturedContent = await new Promise<string>((resolve, reject) => {
        // 保存原始的 writeText 方法
        const originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard)

        // 设置超时
        const timeout = setTimeout(() => {
          navigator.clipboard.writeText = originalWriteText
          reject(new Error('等待复制内容超时'))
        }, 5000)

        // 覆盖 writeText 方法来拦截内容
        navigator.clipboard.writeText = async (text: string) => {
          clearTimeout(timeout)
          // 恢复原始方法
          navigator.clipboard.writeText = originalWriteText
          // 仍然执行原始的复制操作
          await originalWriteText(text)
          // 返回拦截到的内容
          resolve(text)
        }

        // 点击按钮触发复制
        button.click()
      })

      return { success: true, content: capturedContent }
    }
    catch (error) {
      return { success: false, error: `提取失败: ${error}` }
    }
  }

  /**
   * 等待"复制页面"按钮出现并可点击
   */
  private async waitForButton(timeout: number): Promise<HTMLButtonElement | null> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      // 查找包含"复制页面"文本的按钮
      const buttons = document.querySelectorAll('button')
      for (const button of buttons) {
        if (button.textContent?.includes('复制页面') && !button.disabled) {
          return button as HTMLButtonElement
        }
      }
      await this.wait(200)
    }

    return null
  }

  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private showToast(message: string, duration = 3000) {
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.position = 'fixed'
    toast.style.top = '20px'
    toast.style.left = '50%'
    toast.style.transform = 'translateX(-50%)'
    toast.style.backgroundColor = 'rgba(16, 185, 129, 0.95)'
    toast.style.color = '#fff'
    toast.style.padding = '12px 24px'
    toast.style.borderRadius = '6px'
    toast.style.zIndex = '2147483647'
    toast.style.fontSize = '14px'
    toast.style.lineHeight = '1.5'
    toast.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)'
    toast.style.pointerEvents = 'none'
    toast.style.textAlign = 'center'
    toast.style.maxWidth = '80vw'
    toast.style.whiteSpace = 'pre-line'

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transition = 'opacity 0.5s'
      setTimeout(() => toast.remove(), 500)
    }, duration)
  }
}

export const apiDocExtractor = new ApiDocExtractor()
