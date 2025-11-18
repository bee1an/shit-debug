/**
 * OpenKey获取工具
 * 提供从browser.storage.local读取key_req_host并获取openkey的功能
 */

// OpenKey相关类型定义
export interface KeyReqHost {
  url: string
  headers: string
}

export interface OpenKeyResult {
  success: boolean
  url?: string
  status?: number
  statusText?: string
  response?: string
  error?: string
  timestamp: string
}

export interface OpenKeyData {
  code: number
  result: {
    openKey: string
    t: string
  }
  msg: string | null
}

export interface OpenKeyParseResult {
  success: boolean
  data?: OpenKeyData
  error?: string
}

/**
 * 从storage读取key_req_host并获取openkey
 * @param timeoutMs 请求超时时间，默认10秒
 * @returns Promise<OpenKeyResult> openkey获取结果
 */
export async function getOpenKey(timeoutMs = 10000): Promise<OpenKeyResult> {
  try {
    // 从storage读取key_req_host数据
    const storedData = await browser.storage.local.get('key_req_host')
    const keyReqHost = storedData.key_req_host as KeyReqHost

    if (!keyReqHost || !keyReqHost.url) {
      throw new Error('未找到有效的请求配置，请先访问目标页面')
    }

    // 解析请求头
    let headers: Record<string, string> = {}
    try {
      if (keyReqHost.headers) {
        const parsedHeaders = JSON.parse(keyReqHost.headers)
        headers = Array.isArray(parsedHeaders)
          ? parsedHeaders.reduce((acc: Record<string, string>, header: any) => {
            acc[header.name] = header.value
            return acc
          }, {})
          : parsedHeaders
      }
    }
    catch {
      // 如果解析失败，使用空headers
    }

    // 发起fetch请求，设置超时
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetch(keyReqHost.url, {
        method: 'GET',
        headers,
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const responseText = await response.text()
      const timestamp = new Date().toLocaleString('zh-CN')

      return {
        success: response.ok,
        url: keyReqHost.url,
        status: response.status,
        statusText: response.statusText,
        response: responseText,
        timestamp,
      }
    }
    catch (fetchError) {
      clearTimeout(timeoutId)
      throw fetchError
    }
  }
  catch (error) {
    const timestamp = new Date().toLocaleString('zh-CN')
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
      timestamp,
    }
  }
}

/**
 * 复制OpenKey获取结果到剪切板
 * @param result OpenKey获取结果
 * @returns Promise<boolean> 是否复制成功
 */
export async function copyOpenKeyResult(result: OpenKeyResult): Promise<boolean> {
  try {
    const resultText = JSON.stringify(result, null, 2)
    await navigator.clipboard.writeText(resultText)
    return true
  }
  catch {
    return false
  }
}

/**
 * 检查是否有可用的OpenKey配置
 * @returns Promise<boolean> 是否有有效配置
 */
export async function hasValidOpenKeyConfig(): Promise<boolean> {
  try {
    const storedData = await browser.storage.local.get('key_req_host')
    const keyReqHost = storedData.key_req_host as KeyReqHost
    return !!(keyReqHost && keyReqHost.url)
  }
  catch {
    return false
  }
}

/**
 * 解析OpenKey API响应
 * @param responseText API响应文本
 * @returns OpenKeyParseResult 解析结果
 */
export function parseOpenKeyResponse(responseText: string): OpenKeyParseResult {
  try {
    const data = JSON.parse(responseText) as OpenKeyData
    if (data.code === 200 && data.result?.openKey) {
      return {
        success: true,
        data,
      }
    }
    else {
      return {
        success: false,
        error: data.msg || 'API返回无效数据',
      }
    }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '响应解析失败',
    }
  }
}

/**
 * 获取并解析OpenKey数据
 * @param timeoutMs 请求超时时间，默认10秒
 * @returns Promise<OpenKeyParseResult> 包含openKey的解析结果
 */
export async function getAndParseOpenKey(timeoutMs = 10000): Promise<OpenKeyParseResult> {
  const result = await getOpenKey(timeoutMs)

  if (!result.success || !result.response) {
    return {
      success: false,
      error: result.error || 'OpenKey获取失败',
    }
  }

  return parseOpenKeyResponse(result.response)
}

/**
 * 解析URL hash中的参数
 * @param hash URL的hash部分（不包含#）
 * @returns Record<string, string> 参数对象
 */
function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {}

  // 如果hash中没有查询参数，返回空对象
  if (!hash.includes('&') && !hash.includes('=')) {
    return params
  }

  // 分割参数
  const paramPairs = hash.split('&')

  for (const pair of paramPairs) {
    const [key, value] = pair.split('=')
    if (key && value !== undefined) {
      params[decodeURIComponent(key)] = decodeURIComponent(value)
    }
  }

  return params
}

/**
 * 将参数对象转换为hash字符串
 * @param params 参数对象
 * @returns string hash字符串
 */
function paramsToHash(params: Record<string, string>): string {
  const paramPairs: string[] = []

  for (const [key, value] of Object.entries(params)) {
    paramPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  }

  return paramPairs.length > 0 ? `${paramPairs.join('&')}` : ''
}

/**
 * 替换URL中的openKey参数
 * @param url 原始URL
 * @param newOpenKey 新的openKey值
 * @returns string 替换后的URL
 */
export function replaceOpenKeyInUrl(url: string, newOpenKey: string): string {
  try {
    const urlObj = new URL(url)

    // 首先检查search参数中是否有openKey
    if (urlObj.searchParams.has('openKey')) {
      urlObj.searchParams.set('openKey', newOpenKey)
      return urlObj.toString()
    }

    // 如果search中没有，检查hash中是否有openKey
    if (urlObj.hash) {
      const [perfix, params] = urlObj.hash.replace(/^#/, '').split('?')

      const hashParams = parseHashParams(params)

      if (hashParams.openKey !== undefined) {
        // 更新hash中的openKey
        hashParams.openKey = newOpenKey
        urlObj.hash = `${perfix}?${paramsToHash(hashParams)}`
        return urlObj.toString()
      }
    }

    // 如果search和hash中都没有openKey，添加到hash中
    const baseUrl = urlObj.origin + urlObj.pathname + urlObj.search
    const newHash = urlObj.hash ? `${urlObj.hash}&openKey=${encodeURIComponent(newOpenKey)}` : `#openKey=${encodeURIComponent(newOpenKey)}`
    return `${baseUrl}${newHash}`
  }
  catch {
    // 如果URL解析失败，使用字符串替换方法处理hash中的参数
    const hashMatch = url.match(/#([^?]*)/)
    if (!hashMatch) {
      // 没有hash，直接添加到search参数
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}openKey=${encodeURIComponent(newOpenKey)}`
    }

    const baseUrl = url.slice(0, hashMatch.index)
    const hashContent = hashMatch[1]

    // 检查hash中是否有openKey参数
    const openKeyRegex = /[?&]openKey=[^&]*/
    if (openKeyRegex.test(hashContent)) {
      // 替换现有的openKey参数
      const updatedHash = hashContent.replace(openKeyRegex, (prefix) => {
        return `${prefix}openKey=${encodeURIComponent(newOpenKey)}`
      })
      return `${baseUrl}#${updatedHash}`
    }

    // 如果hash中没有openKey，添加它
    const separator = hashContent.includes('&') ? '&' : (hashContent.includes('?') ? '&' : '?')
    const updatedHash = `${hashContent}${separator}openKey=${encodeURIComponent(newOpenKey)}`
    return `${baseUrl}#${updatedHash}`
  }
}
