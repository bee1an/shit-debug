import { describe, expect, it } from 'vitest'
// import { replaceOpenKeyInUrl } from '../openKey'

function paramsToHash(params: Record<string, string>): string {
  const paramPairs: string[] = []

  for (const [key, value] of Object.entries(params)) {
    paramPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  }

  return paramPairs.length > 0 ? `${paramPairs.join('&')}` : ''
}

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

describe('openKey', () => {
  it('should be true', () => {
    decodeURIComponent('openKey')
    expect(replaceOpenKeyInUrl('https://example.com/#/sub?flags=1&openKey=123', 'openKey'))
      .toMatchInlineSnapshot(`"https://example.com/#/sub?flags=1&openKey=openKey"`)

    expect(replaceOpenKeyInUrl('https://cdpre.tfsmy.com/frontend/smart-front-b/#/collectionJT?openKey=68e714806f9e9800071a87bc1763445575_5101&ui=25ccf62f7470569e239bebe4a530872b888872952bf4694350a04520db455516&cityCode=5101&baseUrl=https://cdszzx.tfsmy.com/cbase/bud-cloud-governance-biz/&subjectCode=510115001&subjectName=柳城街道', 'openKey'))
      .toMatchInlineSnapshot(`"https://cdpre.tfsmy.com/frontend/smart-front-b/#/collectionJT?openKey=openKey&ui=25ccf62f7470569e239bebe4a530872b888872952bf4694350a04520db455516&cityCode=5101&baseUrl=https%3A%2F%2Fcdszzx.tfsmy.com%2Fcbase%2Fbud-cloud-governance-biz%2F&subjectCode=510115001&subjectName=%E6%9F%B3%E5%9F%8E%E8%A1%97%E9%81%93"`)
  })
})
