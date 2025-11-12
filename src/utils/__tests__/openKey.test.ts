import { describe, expect, it } from 'vitest'
// import { replaceOpenKeyInUrl } from '../openKey'

function paramsToHash(params: Record<string, string>): string {
  const paramPairs: string[] = []

  for (const [key, value] of Object.entries(params)) {
    paramPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  }

  return paramPairs.length > 0 ? `#${paramPairs.join('&')}` : ''
}

function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {}

  // 移除开头的 # 或 ?
  const cleanHash = hash.replace(/^#/, '').replaceAll(/^\?/, '')

  // 如果hash中没有查询参数，返回空对象
  if (!cleanHash.includes('&') && !cleanHash.includes('=')) {
    return params
  }

  // 分割参数
  const paramPairs = cleanHash.split('&')

  for (const pair of paramPairs) {
    const [key, value] = pair.split('=')
    if (key && value !== undefined) {
      params[decodeURIComponent(key)] = decodeURIComponent(value)
    }
  }

  return params
}

function replaceOpenKeyInUrl(url: string, newOpenKey: string): string {
  try {
    const urlObj = new URL(url)

    // 首先检查search参数中是否有openKey
    if (urlObj.searchParams.has('openKey')) {
      urlObj.searchParams.set('openKey', newOpenKey)
      return urlObj.toString()
    }

    // 如果search中没有，检查hash中是否有openKey
    if (urlObj.hash) {
      const hashContent = urlObj.hash.slice(1) // 移除 #
      const hashParams = parseHashParams(hashContent)

      if (hashParams.openKey !== undefined) {
        // 更新hash中的openKey
        hashParams.openKey = newOpenKey
        urlObj.hash = paramsToHash(hashParams)
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

describe('openKey', () => {
  it('should be true', () => {
    decodeURIComponent('openKey')
    expect(replaceOpenKeyInUrl('https://example.com/#/sub?flags=1&openKey=123', 'openKey'))
      .toMatchInlineSnapshot(`"https://example.com/#/sub?openKey=openKey"`)
  })
})
