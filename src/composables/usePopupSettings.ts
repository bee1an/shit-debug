import { ref } from 'vue'

// 默认host配置
const DEFAULT_HOST = 'http://localhost:4000'

// Host配置接口
interface PopupSettings {
  hostPrefix: string
}

// 存储键名
const STORAGE_KEY = 'popup-settings'

// 全局状态
const settings = ref<PopupSettings>({
  hostPrefix: DEFAULT_HOST,
})

/**
 * 弹窗设置管理composable
 * 提供host前缀配置的存储、读取和更新功能
 */
export function usePopupSettings() {
  /**
   * 初始化设置，从存储中读取配置
   */
  async function initSettings(): Promise<void> {
    try {
      const result = await browser.storage.local.get(STORAGE_KEY)
      const storedSettings = result[STORAGE_KEY] as PopupSettings | undefined

      if (storedSettings && typeof storedSettings.hostPrefix === 'string') {
        settings.value.hostPrefix = storedSettings.hostPrefix
      }
      else {
        // 如果没有存储的配置，使用默认值并保存
        settings.value = { hostPrefix: DEFAULT_HOST }
        await saveSettings()
      }
    }
    catch (error) {
      console.error('Failed to load popup settings:', error)
      // 发生错误时使用默认配置
      settings.value = { hostPrefix: DEFAULT_HOST }
    }
  }

  /**
   * 保存设置到存储
   */
  async function saveSettings(): Promise<void> {
    try {
      await browser.storage.local.set({
        [STORAGE_KEY]: settings.value,
      } as Record<string, PopupSettings>)
    }
    catch (error) {
      console.error('Failed to save popup settings:', error)
      throw new Error('保存设置失败')
    }
  }

  /**
   * 更新host前缀配置
   */
  async function updateHostPrefix(hostPrefix: string): Promise<void> {
    if (typeof hostPrefix !== 'string' || !hostPrefix.trim()) {
      throw new Error('Host前缀不能为空')
    }

    // 基本的URL格式验证
    try {
      void new URL(hostPrefix)
    }
    catch {
      // 如果不是完整URL，尝试添加协议
      const withProtocol = hostPrefix.startsWith('http')
        ? hostPrefix
        : `http://${hostPrefix}`

      try {
        void new URL(withProtocol)
        hostPrefix = withProtocol
      }
      catch {
        throw new Error('请输入有效的URL格式（如：http://localhost:3000）')
      }
    }

    settings.value.hostPrefix = hostPrefix
    await saveSettings()
  }

  /**
   * 重置为默认设置
   */
  async function resetToDefault(): Promise<void> {
    settings.value = { hostPrefix: DEFAULT_HOST }
    await saveSettings()
  }

  /**
   * 获取当前host前缀
   */
  function getHostPrefix(): string {
    return settings.value.hostPrefix
  }

  /**
   * 根据路径构建完整URL
   */
  function buildUrl(path: string): string {
    if (!path)
      return settings.value.hostPrefix

    // 如果路径已经是完整URL，直接返回
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path
    }

    // 确保hostPrefix以/结尾，path不以/开头
    const host = settings.value.hostPrefix.endsWith('/')
      ? settings.value.hostPrefix.slice(0, -1)
      : settings.value.hostPrefix
    const cleanPath = path.startsWith('/') ? path : `/${path}`

    return `${host}${cleanPath}`
  }

  return {
    // 响应式状态
    settings,

    // 方法
    initSettings,
    saveSettings,
    updateHostPrefix,
    resetToDefault,
    getHostPrefix,
    buildUrl,
  }
}
