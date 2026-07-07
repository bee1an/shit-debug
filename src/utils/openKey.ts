/**
 * OpenKey 获取工具（现场切换方案，无需按区划分桶缓存）
 *
 * 流程：
 *   1. 从 storage 读 bootstrap apiKey（由 background 监听 openKey 请求时记录）
 *   2. 调 /api/resource/product/switch 换取目标 subject 的 apiKey
 *   3. 本地 AES-CBC-PKCS7 算出 sign 和 requestId
 *   4. 调 /openKey/key 拿 openKey
 *
 * sign 算法（从 workbench app.js 逆向）：
 *   key  = "1w3d2sxe45tgbd34"  (硬编码)
 *   iv   = "E08ADE2699714B87"  (硬编码)
 *   sign = AES-CBC-PKCS7(key, iv, requestId).ciphertext.toHex()
 */

import { getArrayFromStorage, saveArrayToStorage } from '~/utils/storage'

// ============ 类型定义 ============

/** 保留旧字段，避免破坏老调用方 */
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

/** 区划信息（subjects 接口返回格式） */
export interface SubjectInfo {
  subjectId: string
  subjectName: string
  cityCode: string
  orgCode: string
  level: number
}

/** 供 UI 使用的区划选项（同 SubjectInfo；为了向后兼容保留 cached 字段并永远 true） */
export interface SubjectOption extends SubjectInfo {
  cached: boolean
  /** 本设备累计使用次数（用于排序展示），无记录时为 0 */
  usageCount?: number
}

interface BootstrapApiKey {
  apiKey: string
  ts: number
}

// ============ 常量 ============

const BUD_HOST = 'https://cdszzx.tfsmy.com'
const DOMAIN = 'bud-cloud-governance-frontend-b'
const RESOURCE_ID = 'vkMoEwRLOO2kmAHZ9AiWA6JF1NCYm1pE'
const AES_KEY = '1w3d2sxe45tgbd34'
const AES_IV = 'E08ADE2699714B87'

const BOOTSTRAP_API_KEY = 'bootstrap_api_key'

// ============ sign 生成 ============

function toHex(bytes: Uint8Array): string {
  let hex = ''
  for (let i = 0; i < bytes.length; i++)
    hex += bytes[i].toString(16).padStart(2, '0')
  return hex
}

function randomHex(byteLen: number): string {
  const arr = new Uint8Array(byteLen)
  crypto.getRandomValues(arr)
  return toHex(arr)
}

async function encryptSign(plain: string): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(AES_KEY),
    { name: 'AES-CBC' },
    false,
    ['encrypt'],
  )
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv: enc.encode(AES_IV) },
    key,
    enc.encode(plain),
  )
  return toHex(new Uint8Array(cipher))
}

/** 生成 requestId + sign，与页面 axios 拦截器产出一致 */
export async function buildSignedParams(): Promise<{ requestId: string, sign: string }> {
  const requestId = `${Date.now()}_${randomHex(16)}`
  const sign = await encryptSign(requestId)
  return { requestId, sign }
}

// ============ bootstrap apiKey 读写 ============

async function getBootstrapApiKey(): Promise<string | undefined> {
  try {
    const r = await browser.storage.local.get(BOOTSTRAP_API_KEY)
    const entry = r[BOOTSTRAP_API_KEY] as BootstrapApiKey | undefined
    return entry?.apiKey
  }
  catch {
    return undefined
  }
}

// ============ 基础请求工具 ============

function buildCommonHeaders(apiKey: string, subject?: SubjectInfo): Record<string, string> {
  const headers: Record<string, string> = {
    'accept': 'application/json, text/plain, */*',
    'api-key': apiKey,
    'apikey': apiKey,
  }
  if (subject) {
    headers['subject-id'] = subject.subjectId
    headers['org-id'] = subject.subjectId
    headers['org-code'] = subject.orgCode
    headers['area-code'] = subject.orgCode
    headers['city-code'] = subject.cityCode
  }
  return headers
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal, credentials: 'include' })
  }
  finally {
    clearTimeout(timeoutId)
  }
}

// ============ 区划目录 ============

/**
 * 获取当前账号可用的全部区划
 */
export async function fetchSubjectsCatalog(timeoutMs = 10000): Promise<SubjectInfo[]> {
  const apiKey = await getBootstrapApiKey()
  if (!apiKey)
    return []

  try {
    const res = await fetchWithTimeout(
      `${BUD_HOST}/cbase/bud-permissions-biz/api/subject/admin/subjects?domain=${DOMAIN}`,
      { method: 'GET', headers: buildCommonHeaders(apiKey) },
      timeoutMs,
    )
    if (!res.ok)
      return []
    const data = await res.json() as { code?: number, result?: { list?: SubjectInfo[] } }
    if (data.code !== 200 || !data.result?.list)
      return []
    return data.result.list.map(item => ({
      subjectId: item.subjectId,
      subjectName: item.subjectName,
      cityCode: item.cityCode,
      orgCode: item.orgCode,
      level: item.level,
    }))
  }
  catch {
    return []
  }
}

/**
 * UI 用：拉取区划列表，按「使用次数降序」优先排序，其次按层级、名称。
 * 使用次数来自本地存储（subject_usage_counts），仅在本设备累计。
 */
export async function listSubjectOptions(): Promise<SubjectOption[]> {
  const [catalog, counts] = await Promise.all([
    fetchSubjectsCatalog(),
    getSubjectUsageCounts(),
  ])
  return catalog
    .map<SubjectOption>(info => ({
      ...info,
      cached: true,
      usageCount: counts[info.subjectId] || 0,
    }))
    .sort((a, b) => {
      // Most-used first; ties fall back to level then name for stable ordering.
      if (a.usageCount !== b.usageCount)
        return b.usageCount - a.usageCount
      if (a.level !== b.level)
        return a.level - b.level
      return a.subjectName.localeCompare(b.subjectName, 'zh')
    })
}

// ============ 区划使用次数（本地累计，用于下拉排序） ============

const SUBJECT_USAGE_COUNTS_KEY = 'subject_usage_counts'

/** 读取所有区划的使用次数 */
export async function getSubjectUsageCounts(): Promise<Record<string, number>> {
  const entries = await getArrayFromStorage<[string, number]>(SUBJECT_USAGE_COUNTS_KEY)
  return Object.fromEntries(entries)
}

/** 指定区划使用次数 +1（成功使用后调用） */
export async function incrementSubjectUsage(subjectId: string): Promise<void> {
  if (!subjectId)
    return
  const counts = await getSubjectUsageCounts()
  counts[subjectId] = (counts[subjectId] || 0) + 1
  // Record 以 [k, v] 数组形式复用现有 storage 工具，避免引入新存储格式。
  const entries = Object.entries(counts)
  await saveArrayToStorage(SUBJECT_USAGE_COUNTS_KEY, entries)
}

// ============ 核心：按 subject 换取 openKey ============

/**
 * 调 switch 接口换取目标 subject 的 apiKey
 */
async function switchApiKey(subjectId: string, bootstrapApiKey: string, timeoutMs = 10000): Promise<string> {
  const res = await fetchWithTimeout(
    `${BUD_HOST}/cbase/bud-permissions-biz/api/resource/product/switch`,
    {
      method: 'POST',
      headers: {
        ...buildCommonHeaders(bootstrapApiKey),
        'content-type': 'application/json',
        'subject-id': subjectId,
      },
      body: JSON.stringify({ id: RESOURCE_ID }),
    },
    timeoutMs,
  )
  if (!res.ok)
    throw new Error(`switch 失败: ${res.status} ${res.statusText}`)
  const data = await res.json() as { code?: number, result?: { apiKey?: string }, msg?: string }
  if (data.code !== 200 || !data.result?.apiKey)
    throw new Error(`switch 失败: ${data.msg || 'apiKey 未返回'}`)
  return data.result.apiKey
}

/**
 * 指定区划获取 openKey（核心入口）
 */
export async function getOpenKeyBySubject(subjectOrId: SubjectInfo | string, timeoutMs = 10000): Promise<OpenKeyParseResult> {
  try {
    const bootstrap = await getBootstrapApiKey()
    if (!bootstrap) {
      return {
        success: false,
        error: '请先在 workbench 页面访问一次以初始化 apiKey',
      }
    }

    // 补齐 subject 信息（若只传了 id，就从 catalog 里查）
    let subject: SubjectInfo
    if (typeof subjectOrId === 'string') {
      const catalog = await fetchSubjectsCatalog(timeoutMs)
      const hit = catalog.find(s => s.subjectId === subjectOrId)
      if (!hit)
        return { success: false, error: `未在区划目录中找到 ${subjectOrId}` }
      subject = hit
    }
    else {
      subject = subjectOrId
    }

    const targetApiKey = await switchApiKey(subject.subjectId, bootstrap, timeoutMs)
    const { requestId, sign } = await buildSignedParams()
    const url = `${BUD_HOST}/cbase/bud-cloud-governance-biz/openKey/key?requestId=${requestId}&sign=${sign}`

    const res = await fetchWithTimeout(
      url,
      { method: 'GET', headers: buildCommonHeaders(targetApiKey, subject) },
      timeoutMs,
    )
    if (!res.ok)
      return { success: false, error: `openKey 请求失败: ${res.status} ${res.statusText}` }

    const text = await res.text()
    return parseOpenKeyResponse(text)
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

// ============ 兼容旧调用方 ============

/**
 * 解析 OpenKey API 响应
 */
export function parseOpenKeyResponse(responseText: string): OpenKeyParseResult {
  try {
    const data = JSON.parse(responseText) as OpenKeyData
    if (data.code === 200 && data.result?.openKey)
      return { success: true, data }
    return { success: false, error: data.msg || 'API返回无效数据' }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '响应解析失败',
    }
  }
}

/**
 * 旧接口：用本地 bootstrap apiKey + 当前 subject 获取 openKey
 * 注意：不再依赖 key_req_host 的 headers 重放，而是重新走 switch 链路
 */
export async function getAndParseOpenKey(timeoutMs = 10000): Promise<OpenKeyParseResult> {
  try {
    const bootstrap = await getBootstrapApiKey()
    if (!bootstrap) {
      return {
        success: false,
        error: '请先在 workbench 页面访问一次以初始化 apiKey',
      }
    }

    // bootstrap apiKey 后缀就是最近一次的 subjectId，直接从它里面推
    const tail = bootstrap.split('-').pop()
    if (!tail)
      return { success: false, error: 'bootstrap apiKey 异常' }

    const catalog = await fetchSubjectsCatalog(timeoutMs)
    const subject = catalog.find(s => s.subjectId === tail)
    if (!subject)
      return { success: false, error: '未能识别最近一次的区划，请重新在 workbench 访问' }

    return getOpenKeyBySubject(subject, timeoutMs)
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}

export async function hasValidOpenKeyConfig(): Promise<boolean> {
  const apiKey = await getBootstrapApiKey()
  return !!apiKey
}

/**
 * 旧接口：仅复制结果文本到剪贴板
 */
export async function copyOpenKeyResult(result: OpenKeyResult): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(JSON.stringify(result, null, 2))
    return true
  }
  catch {
    return false
  }
}

/**
 * 旧接口：保留签名。内部已不再使用 key_req_host，直接走新链路
 */
export async function getOpenKey(timeoutMs = 10000): Promise<OpenKeyResult> {
  const timestamp = new Date().toLocaleString('zh-CN')
  const parsed = await getAndParseOpenKey(timeoutMs)
  if (parsed.success && parsed.data) {
    return {
      success: true,
      response: JSON.stringify(parsed.data),
      status: 200,
      statusText: 'OK',
      timestamp,
    }
  }
  return { success: false, error: parsed.error, timestamp }
}

// ============ URL 替换工具（保留不动） ============

function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {}
  if (!hash.includes('&') && !hash.includes('='))
    return params
  const paramPairs = hash.split('&')
  for (const pair of paramPairs) {
    const [key, value] = pair.split('=')
    if (key && value !== undefined)
      params[decodeURIComponent(key)] = decodeURIComponent(value)
  }
  return params
}

function paramsToHash(params: Record<string, string>): string {
  const paramPairs: string[] = []
  for (const [key, value] of Object.entries(params))
    paramPairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
  return paramPairs.length > 0 ? `${paramPairs.join('&')}` : ''
}

export function replaceOpenKeyInUrl(url: string, newOpenKey: string): string {
  try {
    const urlObj = new URL(url)
    if (urlObj.searchParams.has('openKey')) {
      urlObj.searchParams.set('openKey', newOpenKey)
      return urlObj.toString()
    }
    if (urlObj.hash) {
      const [perfix, params] = urlObj.hash.replace(/^#/, '').split('?')
      const hashParams = parseHashParams(params)
      if (hashParams.openKey !== undefined) {
        hashParams.openKey = newOpenKey
        urlObj.hash = `${perfix}?${paramsToHash(hashParams)}`
        return urlObj.toString()
      }
    }
    const baseUrl = urlObj.origin + urlObj.pathname + urlObj.search
    const newHash = urlObj.hash
      ? `${urlObj.hash}&openKey=${encodeURIComponent(newOpenKey)}`
      : `#openKey=${encodeURIComponent(newOpenKey)}`
    return `${baseUrl}${newHash}`
  }
  catch {
    const hashMatch = url.match(/#([^?]*)/)
    if (!hashMatch) {
      const separator = url.includes('?') ? '&' : '?'
      return `${url}${separator}openKey=${encodeURIComponent(newOpenKey)}`
    }
    const baseUrl = url.slice(0, hashMatch.index)
    const hashContent = hashMatch[1]
    const openKeyRegex = /[?&]openKey=[^&]*/
    if (openKeyRegex.test(hashContent)) {
      const updatedHash = hashContent.replace(openKeyRegex, prefix => `${prefix.charAt(0)}openKey=${encodeURIComponent(newOpenKey)}`)
      return `${baseUrl}#${updatedHash}`
    }
    const separator = hashContent.includes('&') ? '&' : (hashContent.includes('?') ? '&' : '?')
    const updatedHash = `${hashContent}${separator}openKey=${encodeURIComponent(newOpenKey)}`
    return `${baseUrl}#${updatedHash}`
  }
}

// ============ 刷新当前页面鉴权 ============

export interface RefreshAuthResult {
  success: boolean
  error?: string
  /** 用于 UI 反馈：实际用于刷新的区划 */
  subjectName?: string
  /** 调试用：替换后的 URL */
  newUrl?: string
}

/**
 * 刷新当前 tab 的鉴权：
 *   1. 拿到当前 tab 的 URL
 *   2. 用传入的区划换取新的 openKey
 *   3. 把 openKey 替换/补充到 URL
 *   4. 用新的 URL 重新加载当前 tab
 */
export async function refreshCurrentTabAuth(subjectId: string): Promise<RefreshAuthResult> {
  try {
    if (!subjectId)
      return { success: false, error: '请先选择区划' }

    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab?.id || !tab.url)
      return { success: false, error: '无法获取当前标签页 URL' }

    const catalog = await fetchSubjectsCatalog()
    const subject = catalog.find(s => s.subjectId === subjectId)
    if (!subject)
      return { success: false, error: `未找到指定区划 ${subjectId}` }

    const parsed = await getOpenKeyBySubject(subject)
    if (!parsed.success || !parsed.data?.result?.openKey)
      return { success: false, error: parsed.error || 'openKey 获取失败', subjectName: subject.subjectName }

    const newUrl = replaceOpenKeyInUrl(tab.url, parsed.data.result.openKey)
    await browser.tabs.update(tab.id, { url: newUrl })

    return { success: true, subjectName: subject.subjectName, newUrl }
  }
  catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : '未知错误',
    }
  }
}
