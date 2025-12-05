class AutoFillManager {
  private isSelecting = false
  private overlay: HTMLElement | null = null
  private boundMouseOver: (e: MouseEvent) => void
  private boundClick: (e: MouseEvent) => void
  private boundKeyDown: (e: KeyboardEvent) => void

  constructor() {
    this.boundMouseOver = this.handleMouseOver.bind(this)
    this.boundClick = this.handleClick.bind(this)
    this.boundKeyDown = this.handleKeyDown.bind(this)

    this.setupMessageListener()
  }

  private setupMessageListener() {
    const runtime = (window as any).browser?.runtime || (window as any).chrome?.runtime

    if (runtime) {
      runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
        if (message.type === 'TOGGLE_AUTO_FILL') {
          this.toggleSelectionMode()
          sendResponse({ success: true })
        }
        // Return true to indicate we might respond asynchronously (though we responded synchronously above, it's safer)
        // Or return false/undefined if sync.
        return false
      })
    }
    else {
      console.error('[AutoFill] No runtime found (neither browser nor chrome)')
    }
  }

  private toggleSelectionMode() {
    this.isSelecting = !this.isSelecting
    if (this.isSelecting) {
      this.enableSelection()
      this.showToast('请点击要填充的表单区域 (按 Esc 退出)')
    }
    else {
      this.disableSelection()
    }
  }

  private enableSelection() {
    document.body.style.cursor = 'crosshair'
    document.addEventListener('mouseover', this.boundMouseOver, true)
    document.addEventListener('click', this.boundClick, true)
    document.addEventListener('keydown', this.boundKeyDown, true)
  }

  private disableSelection() {
    document.body.style.cursor = ''
    document.removeEventListener('mouseover', this.boundMouseOver, true)
    document.removeEventListener('click', this.boundClick, true)
    document.removeEventListener('keydown', this.boundKeyDown, true)
    this.removeOverlay()
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.disableSelection()
      this.showToast('已退出自动填充模式')
    }
  }

  private handleMouseOver(e: MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const target = e.target as HTMLElement
    this.highlightElement(target)
  }

  private highlightElement(element: HTMLElement) {
    if (!this.overlay) {
      this.overlay = document.createElement('div')
      this.overlay.style.position = 'absolute'
      this.overlay.style.border = '2px solid #409EFF'
      this.overlay.style.backgroundColor = 'rgba(64, 158, 255, 0.1)'
      this.overlay.style.pointerEvents = 'none'
      this.overlay.style.zIndex = '999999'
      this.overlay.style.transition = 'all 0.1s ease'
      document.body.appendChild(this.overlay)
    }

    const rect = element.getBoundingClientRect()
    this.overlay.style.top = `${window.scrollY + rect.top}px`
    this.overlay.style.left = `${window.scrollX + rect.left}px`
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
    e.preventDefault()
    e.stopPropagation()

    const target = e.target as HTMLElement
    this.disableSelection()
    this.isSelecting = false // Explicitly set state to false

    await this.fillForm(target)
  }

  private async fillForm(container: HTMLElement) {
    let filledCount = 0

    // 1. Fill standard inputs and textareas
    // Filter out hidden, checkbox, radio to avoid messing up logic too much
    const inputs = container.querySelectorAll('input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea')
    inputs.forEach((input) => {
      const el = input as HTMLInputElement | HTMLTextAreaElement
      // Simple check: if empty, fill it.
      if (!el.value) {
        el.value = `测试${this.generateRandomString(4)}`
        // Dispatch events to ensure Vue/React frameworks pick up the change
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        filledCount++
      }
    })

    // 2. Handle Element Plus Selects
    // Element Plus structure often involves a wrapper that handles click
    const elSelects = container.querySelectorAll('.el-select')
    for (const select of Array.from(elSelects)) {
      if (select.classList.contains('is-disabled'))
        continue

      // Try to find the clickable trigger
      const trigger = select.querySelector('.el-select__wrapper') || select.querySelector('.el-input') || select
      if (trigger) {
        (trigger as HTMLElement).click()
        // Wait for dropdown animation
        await this.wait(300)

        // Find visible poppers
        const poppers = document.querySelectorAll('.el-select__popper[aria-hidden="false"]')
        if (poppers.length > 0) {
          // Usually the last one opened is the one we want
          const lastPopper = poppers[poppers.length - 1]
          const options = lastPopper.querySelectorAll('.el-select-dropdown__item:not(.is-disabled)')
          if (options.length > 0) {
            // Pick a random option
            const randomOption = options[Math.floor(Math.random() * options.length)] as HTMLElement
            randomOption.click()
            filledCount++
          }
        }
      }
      // Small delay between selects to look natural and avoid race conditions
      await this.wait(100)
    }

    this.showToast(`已填充 ${filledCount} 个字段`)
  }

  private generateRandomString(length: number) {
    return Math.random().toString(36).substring(2, 2 + length)
  }

  private wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private showToast(message: string) {
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.position = 'fixed'
    toast.style.top = '20px'
    toast.style.left = '50%'
    toast.style.transform = 'translateX(-50%)'
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.8)'
    toast.style.color = '#fff'
    toast.style.padding = '10px 20px'
    toast.style.borderRadius = '4px'
    toast.style.zIndex = '1000000'
    toast.style.fontSize = '14px'
    toast.style.boxShadow = '0 2px 12px 0 rgba(0, 0, 0, 0.1)'
    toast.style.pointerEvents = 'none'

    document.body.appendChild(toast)

    setTimeout(() => {
      toast.style.opacity = '0'
      toast.style.transition = 'opacity 0.5s'
      setTimeout(() => toast.remove(), 500)
    }, 3000)
  }
}

// Singleton instance
export const autoFillManager = new AutoFillManager()
