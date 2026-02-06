<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import SearchComponent from './components/SearchComponent.vue'
import IframeComponent from './components/IframeComponent.vue'
import MessageComponent from './components/MessageComponent.vue'
import BaseInput from './components/BaseInput.vue'
import { usePopupSettings } from '~/composables/usePopupSettings'
import { getAndParseOpenKey, hasValidOpenKeyConfig } from '~/utils/openKey'

// 使用设置管理composable
const {
  settings,
  updateHostPrefix,
  initSettings,
} = usePopupSettings()

// Host配置状态
const hostInput = ref('')
const isHostSaving = ref(false)

// 监听settings变化，同步到输入框
watch(() => settings.value.hostPrefix, (newHostPrefix) => {
  hostInput.value = newHostPrefix
}, { immediate: true })

// 组件引用
const searchComponentRef = ref<InstanceType<typeof SearchComponent>>()

// 统一消息状态
const message = ref('')

// 获取OpenKey按钮状态
type OpenKeyButtonState = 'idle' | 'loading' | 'success' | 'error'
const openKeyButtonState = ref<OpenKeyButtonState>('idle')
const isGettingOpenKey = ref(false)

// 自动填充状态
const autoFillActive = ref(false)

// API文档提取状态
interface ExtractedDoc {
  title: string
  content: string
  url: string
}

interface ExtractionProgress {
  current: number
  total: number
  currentTitle: string
  status: 'idle' | 'selecting' | 'extracting' | 'done' | 'error'
  docs: ExtractedDoc[]
  error?: string
}

const extractionProgress = ref<ExtractionProgress>({
  current: 0,
  total: 0,
  currentTitle: '',
  status: 'idle',
  docs: [],
})

// 广告屏蔽功能
async function blockAds() {
  try {
    const expireTime = Math.floor((Date.now() + (8 * 60 * 60 * 1000)) / 1000)
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

    if (!tab.id) {
      message.value = '无法获取当前标签页信息'
      return
    }

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (expireTime: string) => {
        localStorage.setItem('adExpire2', expireTime)
      },
      args: [expireTime.toString()],
    })
    message.value = '广告屏蔽已激活，有效期8小时'
  }
  catch {
    message.value = '广告屏蔽激活失败'
  }
}

// 自动填充功能
async function handleAutoFill() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) {
      message.value = '无法获取当前标签页信息'
      return
    }

    // 如果 API 提取正在选择中，先取消它
    if (extractionProgress.value.status === 'selecting') {
      await browser.tabs.sendMessage(tab.id, { type: 'TOGGLE_API_DOC_EXTRACT', active: false })
      extractionProgress.value.status = 'idle'
    }

    const response = await browser.tabs.sendMessage(tab.id, { type: 'TOGGLE_AUTO_FILL' }) as { active?: boolean } | undefined
    // 使用 content script 返回的实际状态
    autoFillActive.value = response?.active ?? !autoFillActive.value

    if (autoFillActive.value) {
      message.value = '自动填充模式已开启，请在页面中点击要填充的区域'
    }
    else {
      message.value = '自动填充模式已关闭'
    }
  }
  catch (error) {
    console.error('AutoFill error:', error)
    const err = error as Error
    message.value = `通信错误: ${err.message || '未知错误'} \n请确保页面已刷新`
  }
}

// API文档提取功能
async function handleApiDocExtract() {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) {
      message.value = '无法获取当前标签页信息'
      return
    }

    // 如果自动填充正在选择中，先取消它
    if (autoFillActive.value) {
      await browser.tabs.sendMessage(tab.id, { type: 'TOGGLE_AUTO_FILL', active: false })
      autoFillActive.value = false
    }

    const response = await browser.tabs.sendMessage(tab.id, { type: 'TOGGLE_API_DOC_EXTRACT' }) as { active?: boolean } | undefined
    // 使用 content script 返回的实际状态
    const isActive = response?.active ?? false

    if (isActive) {
      extractionProgress.value.status = 'selecting'
      message.value = 'API文档提取模式已开启'
    }
    else {
      if (extractionProgress.value.status === 'selecting') {
        extractionProgress.value.status = 'idle'
      }
      message.value = 'API文档提取模式已关闭'
    }
  }
  catch (error) {
    console.error('ApiDocExtract error:', error)
    const err = error as Error
    message.value = `通信错误: ${err.message || '未知错误'} \n请确保页面已刷新`
  }
}

// 监听提取进度更新
function setupExtractionListener() {
  browser.runtime.onMessage.addListener((msg: any) => {
    if (msg.type === 'EXTRACTION_PROGRESS_UPDATE' && msg.progress) {
      extractionProgress.value = msg.progress
      if (msg.progress.status === 'extracting') {
        message.value = `正在提取: ${msg.progress.current}/${msg.progress.total} - ${msg.progress.currentTitle}`
      }
      else if (msg.progress.status === 'done') {
        message.value = `已收集 ${msg.progress.docs.length} 个文档，点击下载`
      }
    }
    // 监听自动填充状态变化
    else if (msg.type === 'AUTO_FILL_STATE_CHANGED') {
      autoFillActive.value = msg.active
      if (!msg.active && msg.filled) {
        message.value = `已填充 ${msg.filled} 个字段`
      }
      else if (!msg.active) {
        message.value = '自动填充模式已关闭'
      }
    }
    // 监听 API 提取状态变化
    else if (msg.type === 'API_EXTRACT_STATE_CHANGED') {
      if (!msg.active && extractionProgress.value.status === 'selecting') {
        extractionProgress.value.status = 'idle'
        message.value = 'API文档提取模式已关闭'
      }
    }
    return undefined
  })
}

// 下载单个文档 - 通过 fetch 获取 md 内容
async function downloadDoc(doc: ExtractedDoc) {
  try {
    message.value = `正在下载: ${doc.title}...`
    const mdUrl = `${doc.url}.md`
    const response = await fetch(mdUrl)

    if (!response.ok) {
      message.value = `下载失败: ${doc.title}`
      return
    }

    const content = await response.text()
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${doc.title.replace(/[/\\?%*:|"<>]/g, '_')}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    message.value = `已下载: ${doc.title}`
  }
  catch (error) {
    message.value = `下载失败: ${doc.title}`
    console.error(error)
  }
}

// 下载所有文档 - 打包成 zip
async function downloadAllDocs() {
  const docs = extractionProgress.value.docs
  if (docs.length === 0) {
    message.value = '没有可下载的文档'
    return
  }

  // 如果只有一个文档，直接下载
  if (docs.length === 1) {
    await downloadDoc(docs[0])
    return
  }

  try {
    message.value = `正在打包 ${docs.length} 个文档...`

    // 动态导入 JSZip
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()

    // 逐个获取并添加到 zip
    for (let i = 0; i < docs.length; i++) {
      const doc = docs[i]
      message.value = `正在获取: ${i + 1}/${docs.length} - ${doc.title}`

      try {
        const mdUrl = `${doc.url}.md`
        const response = await fetch(mdUrl)
        if (response.ok) {
          const content = await response.text()
          const filename = `${doc.title.replace(/[/\\?%*:|"<>]/g, '_')}.md`
          zip.file(filename, content)
        }
      }
      catch (e) {
        console.error(`获取失败: ${doc.title}`, e)
      }
    }

    message.value = '正在生成 zip 文件...'
    const zipBlob = await zip.generateAsync({ type: 'blob' })

    // 下载 zip
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'api-docs.zip'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    message.value = `已下载 ${docs.length} 个文档 (api-docs.zip)`
  }
  catch (error) {
    message.value = '打包失败'
    console.error(error)
  }
}

// 重置提取状态
function resetExtraction() {
  extractionProgress.value = {
    current: 0,
    total: 0,
    currentTitle: '',
    status: 'idle',
    docs: [],
  }
  message.value = ''
}

// 搜索功能处理
async function handleSearch(query: string) {
  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
    if (!tab.id) {
      message.value = '无法获取当前标签页信息'
      return
    }

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (searchText: string) => {
        const liElements = Array.from(document.querySelectorAll('li'))
        const matchedElements = liElements.filter(li =>
          li.textContent.trim().includes(searchText),
        )

        matchedElements.forEach((li, index) => {
          setTimeout(() => {
            li.click()
          }, index * 100)
        })

        return {
          matchedCount: matchedElements.length,
        }
      },
      args: [query],
    })
      .then((results: unknown) => {
        const result = (results as Array<{ result: { matchedCount: number } }>)[0]?.result
        if (result && result.matchedCount > 0) {
          message.value = `找到匹配的导航并已点击`
        }
        else {
          message.value = `未找到包含 "${query}" 的导航`
        }
      })
  }
  catch {
    message.value = '搜索失败，请重试'
  }
}

// 复制内容处理
function handleCopyContent(_content: string) {
  // 这里可以添加复制到剪贴板的逻辑
  // console.log('Copy content:', content)
}

/**
 * 保存Host配置
 */
async function handleSaveHost() {
  if (isHostSaving.value || !hostInput.value.trim())
    return

  isHostSaving.value = true

  try {
    await updateHostPrefix(hostInput.value.trim())
    message.value = 'Host配置已保存'
  }
  catch {
    message.value = 'Host配置保存失败'
  }
  finally {
    isHostSaving.value = false
  }
}

/**
 * 处理Host输入键盘事件
 */
function handleHostKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleSaveHost()
  }
}

// 点击页面其他地方处理
function handleClickOutside() {
  if (searchComponentRef.value) {
    searchComponentRef.value.handleClickOutside()
  }
}

// 获取OpenKey功能
async function handleGetOpenKey() {
  if (isGettingOpenKey.value)
    return

  isGettingOpenKey.value = true
  openKeyButtonState.value = 'loading'
  message.value = '正在获取OpenKey...'

  try {
    // 检查是否有有效配置
    const hasConfig = await hasValidOpenKeyConfig()
    if (!hasConfig) {
      message.value = '未找到有效的请求配置，请先访问目标页面'
      openKeyButtonState.value = 'error'
      setTimeout(() => {
        openKeyButtonState.value = 'idle'
      }, 2000)
      return
    }

    // 获取并解析OpenKey
    const result = await getAndParseOpenKey()

    if (result.success && result.data?.result?.openKey) {
      const openKey = result.data.result.openKey

      // 复制到剪贴板
      try {
        await navigator.clipboard.writeText(openKey)
        message.value = `OpenKey获取成功并已复制到剪贴板: ${openKey}`
      }
      catch {
        message.value = `OpenKey获取成功: ${openKey}`
      }

      openKeyButtonState.value = 'success'
    }
    else {
      const errorMsg = result.error || 'OpenKey获取失败'
      message.value = `获取失败: ${errorMsg}`
      openKeyButtonState.value = 'error'
    }
  }
  catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误'
    message.value = `获取失败: ${errorMessage}`
    openKeyButtonState.value = 'error'
  }
  finally {
    isGettingOpenKey.value = false

    // 2秒后恢复按钮状态
    setTimeout(() => {
      openKeyButtonState.value = 'idle'
    }, 2000)
  }
}

// 初始化
onMounted(async () => {
  await initSettings()
  setupExtractionListener()
})
</script>

<template>
  <main
    class="w-full h-screen flex flex-col bg-gray-50 text-gray-800 font-sans overflow-hidden"
    @click="handleClickOutside"
  >
    <!-- 内容区域 - 可滚动 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
      <!-- Host前缀配置 -->
      <section class="bg-white rounded-xl shadow-sm border border-gray-100 p-3">
        <div class="flex items-center gap-2">
          <label class="text-sm font-medium text-gray-600 whitespace-nowrap">
            Host
          </label>
          <BaseInput
            v-model="hostInput"
            type="url"
            placeholder="http://localhost:4000"
            class="flex-1"
            :disabled="isHostSaving"
            @keydown="handleHostKeydown"
          />
          <button
            class="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5 whitespace-nowrap"
            :class="isHostSaving
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-gray-900 text-white hover:bg-black shadow-sm hover:shadow-md active:scale-[0.98]'"
            :disabled="isHostSaving || !hostInput.trim()"
            @click="handleSaveHost"
          >
            <svg v-if="isHostSaving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>保存</span>
          </button>
        </div>
      </section>

      <!-- 搜索功能组件 -->
      <section>
        <SearchComponent
          ref="searchComponentRef"
          @search="handleSearch"
        />
      </section>

      <!-- iframe功能组件 -->
      <section>
        <IframeComponent
          @copy-content="handleCopyContent"
        />
      </section>

      <!-- 统一消息组件 -->
      <section v-if="message">
        <MessageComponent :message="message" />
      </section>

      <!-- API文档提取进度和结果 -->
      <section v-if="extractionProgress.status !== 'idle'" class="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-medium text-gray-900">
            API文档提取
          </h3>
          <button
            v-if="extractionProgress.status === 'done'"
            class="text-xs text-gray-500 hover:text-gray-700"
            @click="resetExtraction"
          >
            清空
          </button>
        </div>

        <!-- 提取进度 -->
        <div v-if="extractionProgress.status === 'extracting'" class="space-y-2">
          <div class="flex items-center gap-2">
            <div class="flex-1 bg-gray-200 rounded-full h-2">
              <div
                class="bg-green-500 h-2 rounded-full transition-all duration-300"
                :style="{ width: `${(extractionProgress.current / extractionProgress.total) * 100}%` }"
              />
            </div>
            <span class="text-xs text-gray-500">{{ extractionProgress.current }}/{{ extractionProgress.total }}</span>
          </div>
          <p class="text-xs text-gray-600 truncate">
            正在提取: {{ extractionProgress.currentTitle }}
          </p>
        </div>

        <!-- 提取完成 -->
        <div v-else-if="extractionProgress.status === 'done'" class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm text-green-600">✓ 已提取 {{ extractionProgress.docs.length }} 个文档</span>
            <button
              class="px-3 py-1.5 bg-green-500 text-white text-xs font-medium rounded-lg hover:bg-green-600 transition-colors"
              @click="downloadAllDocs"
            >
              下载全部
            </button>
          </div>

          <!-- 文档列表 -->
          <div class="max-h-40 overflow-y-auto space-y-1">
            <div
              v-for="(doc, index) in extractionProgress.docs"
              :key="index"
              class="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <span class="text-xs text-gray-700 truncate flex-1">{{ doc.title }}</span>
              <button
                class="ml-2 text-xs text-blue-500 hover:text-blue-700 whitespace-nowrap"
                @click="downloadDoc(doc)"
              >
                下载
              </button>
            </div>
          </div>
        </div>

        <!-- 选择状态 -->
        <div v-else-if="extractionProgress.status === 'selecting'" class="text-sm text-gray-600">
          请在页面中点击要提取的 ul 或 li 元素...
        </div>
      </section>
    </div>

    <!-- 底部操作栏 - 固定 -->
    <div class="p-3 bg-white border-t border-gray-100 shadow-sm flex justify-between items-center z-10">
      <!-- 左侧：辅助功能 -->
      <div class="flex gap-1">
        <!-- 屏蔽广告按钮 -->
        <button
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all duration-200"
          title="屏蔽广告弹窗"
          @click="blockAds"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        </button>

        <!-- 自动填充按钮 -->
        <button
          class="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
          :class="{ 'text-blue-600 bg-blue-50': autoFillActive }"
          title="自动填充"
          @click="handleAutoFill"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <!-- API文档提取按钮 -->
        <button
          class="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
          :class="{ 'text-green-600 bg-green-50': extractionProgress.status !== 'idle' }"
          title="提取API文档"
          @click="handleApiDocExtract"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>

      <!-- 右侧：核心设置与 Key -->
      <div class="flex gap-1">
        <!-- 获取OpenKey按钮 -->
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 border"
          :class="{
            'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:text-gray-900': openKeyButtonState === 'idle',
            'bg-gray-100 text-gray-600 border-gray-200 cursor-wait': openKeyButtonState === 'loading',
            'bg-green-50 text-green-600 border-green-100': openKeyButtonState === 'success',
            'bg-red-50 text-red-600 border-red-100': openKeyButtonState === 'error',
          }"
          title="获取OpenKey"
          :disabled="isGettingOpenKey"
          @click="handleGetOpenKey"
        >
          <!-- 加载状态 -->
          <svg v-if="openKeyButtonState === 'loading'" class="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <!-- 成功状态 -->
          <svg v-else-if="openKeyButtonState === 'success'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
          </svg>
          <!-- 错误状态 -->
          <svg v-else-if="openKeyButtonState === 'error'" class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
          <!-- 默认状态 -->
          <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
          <span>OpenKey</span>
        </button>
      </div>
    </div>
  </main>
</template>

<style scoped>
/* slide-up 过渡动画 */
.slide-up-enter-active {
  transition: all 0.3s ease-out;
}

.slide-up-leave-active {
  transition: all 0.2s ease-in;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
