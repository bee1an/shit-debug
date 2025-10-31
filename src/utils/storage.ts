/**
 * 浏览器存储工具函数
 * 统一使用JSON格式存储和读取数组数据
 */

/**
 * 公共存储函数 - 统一使用JSON格式存储数组
 * @param key 存储键名
 * @param data 要存储的数组数据
 */
export async function saveArrayToStorage<T>(key: string, data: T[]): Promise<void> {
  try {
    await browser.storage.local.set({
      [key]: JSON.stringify(data),
    })
  }
  catch (error) {
    console.error(`保存数据到存储失败 (${key}):`, error)
  }
}

/**
 * 公共读取函数 - 统一使用JSON格式读取数组
 * @param key 存储键名
 * @returns 读取到的数组数据，失败时返回空数组
 */
export async function getArrayFromStorage<T>(key: string): Promise<T[]> {
  try {
    const result = await browser.storage.local.get([key])
    const storedData = result[key] as string

    if (!storedData) {
      return []
    }

    const parsed = JSON.parse(storedData)
    return Array.isArray(parsed) ? parsed : []
  }
  catch (error) {
    console.error(`从存储读取数据失败 (${key}):`, error)
    return []
  }
}
