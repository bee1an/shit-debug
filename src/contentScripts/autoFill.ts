class AutoFillManager {
  private isSelecting = false
  private overlay: HTMLElement | null = null
  private boundMouseOver: (e: MouseEvent) => void
  private boundClick: (e: MouseEvent) => void
  private boundKeyDown: (e: KeyboardEvent) => void
  private boundMouseOut: (e: MouseEvent) => void

  constructor() {
    this.boundMouseOver = this.handleMouseOver.bind(this)
    this.boundMouseOut = this.handleMouseOut.bind(this)
    this.boundClick = this.handleClick.bind(this)
    this.boundKeyDown = this.handleKeyDown.bind(this)

    this.setupMessageListener()
    this.setupWindowMessageListener()
  }

  private setupMessageListener() {
    const runtime = (window as any).browser?.runtime || (window as any).chrome?.runtime

    if (runtime) {
      runtime.onMessage.addListener((message: any, _sender: any, sendResponse: any) => {
        if (message.type === 'TOGGLE_AUTO_FILL') {
          // Runtime broadcast reaches all frames. We just toggle our own state.
          // We DO NOT relay this here to avoid double-toggling in iframes.
          this.setSelectionMode(!this.isSelecting)
          sendResponse({ success: true })
        }
        return false
      })
    }
  }

  private setupWindowMessageListener() {
    window.addEventListener('message', (event) => {
      // Allow parent-child extension messages for cross-frame coordination
      if (event.data) {
        if (event.data.type === 'TOGGLE_AUTO_FILL_RELAY') {
          const targetState = event.data.isSelecting
          this.setSelectionMode(targetState)
        }
        else if (event.data.type === 'TRIGGER_AUTO_FILL') {
          this.fillForm(document.body, true)
        }
      }
    })
  }

  private setSelectionMode(active: boolean) {
    if (this.isSelecting === active)
      return

    this.isSelecting = active

    if (this.isSelecting) {
      this.enableSelection()
      if (window === top) {
        this.showToast('请点击要填充的表单区域 (按 Esc 退出)')
      }
    }
    else {
      this.disableSelection()
    }

    // Always propagate state changes to children to ensure sync across iframes
    this.relayToIframes(this.isSelecting)
  }

  private relayToIframes(isSelecting: boolean) {
    const iframes = document.querySelectorAll('iframe')
    iframes.forEach((iframe) => {
      try {
        iframe.contentWindow?.postMessage({
          type: 'TOGGLE_AUTO_FILL_RELAY',
          isSelecting,
        }, '*')
      }
      // eslint-disable-next-line unused-imports/no-unused-vars
      catch (e) {
        // Ignore cross-origin blocking if it happens
      }
    })
  }

  private enableSelection() {
    document.body.style.cursor = 'crosshair'
    document.addEventListener('mouseover', this.boundMouseOver, true)
    document.addEventListener('mouseout', this.boundMouseOut, true)
    document.addEventListener('click', this.boundClick, true)
    document.addEventListener('keydown', this.boundKeyDown, true)
  }

  private disableSelection() {
    document.body.style.cursor = ''
    document.removeEventListener('mouseover', this.boundMouseOver, true)
    document.removeEventListener('mouseout', this.boundMouseOut, true)
    document.removeEventListener('click', this.boundClick, true)
    document.removeEventListener('keydown', this.boundKeyDown, true)
    this.removeOverlay()
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      this.setSelectionMode(false)
      if (window === top) {
        this.showToast('已退出自动填充模式')
      }
    }
  }

  private handleMouseOver(e: MouseEvent) {
    // If target is an iframe, let the mouse enter the iframe so the script inside can handle it.
    const target = e.target as HTMLElement
    if (target.tagName.toLowerCase() === 'iframe') {
      this.removeOverlay()
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
      this.overlay.style.border = '2px solid #409EFF'
      this.overlay.style.backgroundColor = 'rgba(64, 158, 255, 0.1)'
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
    if (target.tagName.toLowerCase() === 'iframe') {
      return
    }

    e.preventDefault()
    e.stopPropagation()

    // Exit selection mode after selection
    this.setSelectionMode(false)

    await this.fillForm(target)
  }

  private async fillForm(container: HTMLElement, silent = false) {
    let filledCount = 0

    const isFillableInput = (el: Element): boolean => {
      const tag = el.tagName.toLowerCase()
      if (tag !== 'input' && tag !== 'textarea')
        return false

      const type = el.getAttribute('type')?.toLowerCase() || 'text'
      const ignoredTypes = ['hidden', 'checkbox', 'radio', 'submit', 'button', 'reset', 'file']
      if (ignoredTypes.includes(type))
        return false

      if (el.hasAttribute('readonly') || el.hasAttribute('disabled'))
        return false

      return true
    }

    // Collect all inputs (including container if it is one)
    let inputsAndTextareas = Array.from(container.querySelectorAll('input, textarea'))
    if (isFillableInput(container)) {
      inputsAndTextareas.push(container as HTMLInputElement | HTMLTextAreaElement)
    }
    inputsAndTextareas = inputsAndTextareas.filter(isFillableInput)

    // Separate generic inputs vs DatePickers
    const datePickerInputs = inputsAndTextareas.filter(el => el.closest('.el-date-editor'))
    const standardInputs = inputsAndTextareas.filter(el => !el.closest('.el-date-editor'))

    // 1. Fill standard inputs
    standardInputs.forEach((input) => {
      const el = input as HTMLInputElement | HTMLTextAreaElement
      if (!el.value) {
        const label = this.findLabel(el)
        const newValue = this.generateSmartValue(label, el)

        el.value = newValue
        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        el.dispatchEvent(new Event('blur', { bubbles: true }))
        filledCount++
      }
    })

    // 2. Handle Element Plus Date Pickers
    for (const input of datePickerInputs) {
      const el = input as HTMLInputElement
      if (!el.value) {
        const wrapper = el.closest('.el-date-editor') as HTMLElement
        if (wrapper) {
          // TODO: Investigate robust Element Plus DatePicker interaction. Current fallback works but UI simulation is flaky.
          wrapper.click()
          await this.wait(300)

          const poppers = document.querySelectorAll('.el-popper[role="tooltip"][aria-hidden="false"]')
          let dateSelected = false
          if (poppers.length > 0) {
            const lastPopper = poppers[poppers.length - 1]
            const days = lastPopper.querySelectorAll('.el-date-table td.available')
            if (days.length > 0) {
              const randomDay = days[Math.floor(Math.random() * days.length)]
              const span = randomDay.querySelector('span') || randomDay as HTMLElement
              span.click()
              dateSelected = true
              filledCount++
            }
          }

          if (!dateSelected) {
            const newValue = this.generateDate()
            el.value = newValue
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
            el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }))
            el.dispatchEvent(new Event('blur', { bubbles: true }))
          }
        }
      }
    }

    // 3. Handle File Inputs (Avatar/Upload)
    const fileInputs = Array.from(container.querySelectorAll('input[type="file"]'))

    for (const input of fileInputs) {
      const el = input as HTMLInputElement
      if (el.files && el.files.length === 0) {
        const base64Data = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg=='
        const byteCharacters = atob(base64Data)
        const byteArray = new Uint8Array(byteCharacters.length)
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i)
        }
        const blob = new Blob([byteArray], { type: 'image/png' })
        const file = new File([blob], 'avatar.png', { type: 'image/png' })

        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        el.files = dataTransfer.files

        el.dispatchEvent(new Event('input', { bubbles: true }))
        el.dispatchEvent(new Event('change', { bubbles: true }))
        filledCount++
      }
    }

    // 4. Handle Element Plus Selects
    const allElements = [container, ...Array.from(container.querySelectorAll('*'))]
    const elSelects = allElements.filter(el => el.classList.contains('el-select'))

    for (const select of elSelects) {
      if (select.classList.contains('is-disabled'))
        continue

      const trigger = select.querySelector('.el-select__wrapper') || select.querySelector('.el-input') || select
      if (trigger) {
        (trigger as HTMLElement).click()
        await this.wait(300)

        const poppers = document.querySelectorAll('.el-select__popper[aria-hidden="false"]')
        if (poppers.length > 0) {
          const lastPopper = poppers[poppers.length - 1]
          const options = lastPopper.querySelectorAll('.el-select-dropdown__item:not(.is-disabled)')
          if (options.length > 0) {
            const randomOption = options[Math.floor(Math.random() * options.length)] as HTMLElement
            randomOption.scrollIntoView({ block: 'nearest' })
            randomOption.click()
            filledCount++
          }
        }
      }
      await this.wait(100)
    }

    // 5. Handle Element Plus Cascaders
    const elCascaders = allElements.filter(el => el.classList.contains('el-cascader'))

    for (const cascader of elCascaders) {
      if (cascader.classList.contains('is-disabled'))
        continue

      const trigger = cascader.querySelector('.el-input') || cascader
      if (trigger) {
        (trigger as HTMLElement).click()
        await this.wait(300)

        const poppers = document.querySelectorAll('.el-cascader__dropdown:not([style*="display: none"])')
        if (poppers.length > 0) {
          const lastPopper = poppers[poppers.length - 1] as HTMLElement

          for (let i = 0; i < 3; i++) {
            const menus = lastPopper.querySelectorAll('.el-cascader-menu')
            if (menus.length === 0)
              break

            const visibleMenus = Array.from(menus).filter(m => (m as HTMLElement).style.display !== 'none')
            if (visibleMenus.length === 0)
              break

            const currentMenu = visibleMenus[visibleMenus.length - 1]
            const items = currentMenu.querySelectorAll('.el-cascader-node:not(.is-disabled)')

            if (items.length === 0)
              break

            const randomItem = items[Math.floor(Math.random() * items.length)] as HTMLElement

            const labelSpan = randomItem.querySelector('.el-cascader-node__label') as HTMLElement || randomItem
            labelSpan.click()
            await this.wait(200)

            // Check if it was a leaf node
            if (!randomItem.querySelector('.el-icon-arrow-right') && !randomItem.querySelector('.el-cascader-node__postfix')) {
              filledCount++
              if (document.body.contains(lastPopper) && lastPopper.style.display !== 'none') {
                (trigger as HTMLElement).click()
              }
              break
            }
          }
        }
      }
      await this.wait(100)
    }

    // 6. Recursive: Trigger iframes within the container
    const iframes = container.querySelectorAll('iframe')
    let triggeredIframes = 0
    if (iframes.length > 0) {
      iframes.forEach((iframe) => {
        try {
          iframe.contentWindow?.postMessage({
            type: 'TRIGGER_AUTO_FILL',
          }, '*')
          triggeredIframes++
        }
        // eslint-disable-next-line unused-imports/no-unused-vars
        catch (e) {
          // ignore
        }
      })
    }

    const resultMsg = `已填充 ${filledCount} 个字段`

    // Only show simple toast notifications
    if (!silent) {
      if (triggeredIframes > 0) {
        this.showToast(`${resultMsg}\n(已触发 ${triggeredIframes} 个子框架填充)`)
      }
      else {
        this.showToast(resultMsg)
      }
    }
  }

  private findLabel(el: HTMLElement): string {
    if (el.id) {
      const label = document.querySelector(`label[for="${el.id}"]`)
      if (label)
        return label.textContent || ''
    }

    let parent = el.parentElement
    while (parent && parent !== document.body) {
      if (parent.classList.contains('el-form-item')) {
        const labelEl = parent.querySelector('.el-form-item__label')
        if (labelEl)
          return labelEl.textContent || ''
        break
      }
      parent = parent.parentElement
    }
    return ''
  }

  private generateSmartValue(label: string, el: HTMLElement): string {
    const text = label.trim()

    if (el.getAttribute('type') === 'date') {
      return this.generateDate()
    }

    if (/电话|手机|mobile|phone/i.test(text)) {
      return this.generatePhone()
    }

    if (/姓名|名字|name/i.test(text)) {
      return this.generateName()
    }

    if (/邮箱|email/i.test(text)) {
      return `test${this.generateRandomString(4)}@example.com`
    }

    if (/身份证|id/i.test(text)) {
      return `11010119900307${Math.floor(1000 + Math.random() * 9000)}`
    }

    if (/出生|生日|日期|时间|date|birth/i.test(text)) {
      return this.generateDate()
    }

    if (/年龄|age/i.test(text)) {
      return Math.floor(18 + Math.random() * 40).toString()
    }

    return `测试${this.generateRandomString(4)}`
  }

  private generatePhone() {
    const secondDigit = Math.floor(Math.random() * 7) + 3
    return `1${secondDigit}${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`
  }

  private generateDate() {
    const year = 1980 + Math.floor(Math.random() * 30)
    const month = (Math.floor(Math.random() * 12) + 1).toString().padStart(2, '0')
    const day = (Math.floor(Math.random() * 28) + 1).toString().padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  private generateName() {
    const surnames = ['赵', '钱', '孙', '李', '周', '吴', '郑', '王', '冯', '陈', '褚', '卫', '蒋', '沈', '韩', '杨']
    const names = ['伟', '芳', '娜', '敏', '静', '秀', '强', '磊', '军', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超']
    const surname = surnames[Math.floor(Math.random() * surnames.length)]
    const name = names[Math.floor(Math.random() * names.length)]
    return surname + name
  }

  private generateRandomString(length: number) {
    return Math.random().toString(36).substring(2, 2 + length)
  }

  private wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  private showToast(message: string, duration = 3000) {
    const toast = document.createElement('div')
    toast.textContent = message
    toast.style.position = 'fixed'
    toast.style.top = '20px'
    toast.style.left = '50%'
    toast.style.transform = 'translateX(-50%)'
    toast.style.backgroundColor = 'rgba(0, 0, 0, 0.85)'
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

export const autoFillManager = new AutoFillManager()
