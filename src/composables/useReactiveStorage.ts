import { onUnmounted, ref, watch } from 'vue'
import type { Ref } from 'vue'
import type { Storage } from 'webextension-polyfill'
import { getArrayFromStorage, saveArrayToStorage } from '../utils/storage'

/**
 * 为浏览器扩展创建响应式存储
 * @param key 存储键名
 * @param defaultValue 默认值
 * @returns 响应式引用对象
 */
export function useReactiveStorage<T>(key: string, defaultValue: T[]): Ref<T[]> {
  const data = ref<T[]>(defaultValue)

  // 初始化加载数据
  async function loadData() {
    try {
      const result = await getArrayFromStorage<T>(key)
      data.value = result
    }
    catch (error) {
      console.error(`加载存储数据失败 (${key}):`, error)
      data.value = defaultValue
    }
  }

  // 监听存储变化
  function handleStorageChange(changes: { [key: string]: Storage.StorageChange }, areaName: string) {
    if (areaName === 'local' && changes[key]) {
      const newValue = changes[key].newValue
      if (typeof newValue === 'string') {
        try {
          // 解析JSON字符串
          const parsedValue = JSON.parse(newValue)
          data.value = Array.isArray(parsedValue) ? parsedValue as T[] : defaultValue
        }
        catch {
          // 如果解析失败，尝试直接使用值
          data.value = Array.isArray(newValue) ? newValue as T[] : defaultValue
        }
      }
      else {
        data.value = defaultValue
      }
    }
  }

  // 监听数据变化并保存到存储
  watch(data, async (newValue) => {
    try {
      await saveArrayToStorage(key, newValue)
    }
    catch (error) {
      console.error(`保存存储数据失败 (${key}):`, error)
    }
  }, { deep: true })

  // 初始化加载
  loadData()

  // 添加存储变化监听器
  const handleStorageChangeBound = handleStorageChange.bind(null)
  browser.storage.onChanged.addListener(handleStorageChangeBound)

  // 清理监听器
  onUnmounted(() => {
    browser.storage.onChanged.removeListener(handleStorageChangeBound)
  })

  return data as Ref<T[]>
}
