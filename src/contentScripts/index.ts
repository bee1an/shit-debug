(() => {
  // 检查是否在目标域名下
  const isTargetDomain = window.location.hostname === 'cdszzx.tfsmy.com'

  // 这是一个兼容处理, 屏蔽页面加载后首页按钮会触发一次click
  let indexClicked = false

  if (isTargetDomain) {
    // 监听 role="menuitem" 的 li 元素点击事件
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement
      const liElement = target.closest('li[role="menuitem"]')

      if (liElement && !liElement.hasAttribute('aria-haspopup')) {
        const textContent = liElement.textContent?.trim()
        if (textContent === '首页' && !indexClicked) {
          indexClicked = true
          return
        }
        if (textContent) {
          // 使用 chrome.storage 保存到搜索历史记录
          saveSearchHistory(textContent)
        }
      }
    }, true) // 使用捕获阶段确保能监听到所有点击事件
  }

  // 保存搜索历史到 browser.storage (这样 popup 也能访问)
  async function saveSearchHistory(text: string) {
    // 获取现有的搜索历史
    const result = await browser.storage.local.get(['li-search-history'])
    const historyArray: string[] = (result['li-search-history'] as string[] | undefined) || []

    // 查找文本是否已存在
    const existingIndex = historyArray.indexOf(text)

    if (existingIndex === -1) {
      // 如果不存在，添加到开头
      historyArray.unshift(text)
    }
    else {
      // 如果已存在，将其移动到最前面
      historyArray.splice(existingIndex, 1) // 从原位置删除
      historyArray.unshift(text) // 添加到开头
    }

    // 只保留最新的30条记录 (与 popup 保持一致)
    const updatedHistory = historyArray.slice(0, 30)

    await browser.storage.local.set({
      'li-search-history': updatedHistory,
    })
  }
})()
