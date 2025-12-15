<script setup lang="ts">
import type { Tabs } from 'webextension-polyfill'
import type { IframeInfo } from '~/composables/useIframeDetector'
import { useIframeDetector } from '~/composables/useIframeDetector'
import { usePopupSettings } from '~/composables/usePopupSettings'

// 定义事件
const emit = defineEmits<{
  copyContent: [content: string]
}>()

// 使用iframe检测composable
const {
  isProcessing,
  message,
  iframeList,
  selectedIframe,
  handleIframeDetection,
  selectIframe,
} = useIframeDetector()

// 使用设置管理composable
const { buildUrl } = usePopupSettings()

// 本地状态
const localMessage = ref('')

// 监听消息变化
watch(() => message.value, (newMessage) => {
  localMessage.value = newMessage
}, { immediate: true })

// 检测页面iframe
async function detectIframes() {
  await handleIframeDetection()
}

// 广告屏蔽功能
async function blockAds() {
  try {
    const expireTime = Math.floor((Date.now() + (8 * 60 * 60 * 1000)) / 1000)
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

    if (!tab.id) {
      localMessage.value = '无法获取当前标签页信息'
      return
    }

    await browser.scripting.executeScript({
      target: { tabId: tab.id },
      func: (expireTime: string) => {
        localStorage.setItem('adExpire2', expireTime)
      },
      args: [expireTime.toString()],
    })
    localMessage.value = '广告屏蔽已激活，有效期8小时'
  }
  catch {
    localMessage.value = '广告屏蔽激活失败'
  }
}

// 跳转到配置的host
async function navigateToHost(shortUrl: string) {
  const url = buildUrl(shortUrl)
  const tab = await browser.tabs.create({ url, active: false })

  if (!tab.id)
    return

  await new Promise((resolve) => {
    const listener = (updatedTabId: number, changeInfo: any) => {
      if (updatedTabId === tab.id && changeInfo.status === 'complete') {
        browser.tabs.onUpdated.removeListener(listener)
        resolve(void 0)
      }
    }
    browser.tabs.onUpdated.addListener(listener)
  })

  await browser.tabs.update(tab.id, { active: true })
}

// 打开所有iframe
async function openAllIframes() {
  if (!iframeList.value.length) {
    localMessage.value = '没有可打开的iframe'
    return
  }

  localMessage.value = `正在打开 ${iframeList.value.length} 个iframe...`

  try {
    const tabs: Tabs.Tab[] = []

    for (const iframe of iframeList.value) {
      const url = iframe.updatedUrl || (iframe.hashContent ? buildUrl(iframe.hashContent) : null)

      if (url) {
        const tab = await browser.tabs.create({ url, active: false })

        if (tab.id) {
          tabs.push(tab)

          await new Promise((resolve) => {
            const listener = (updatedTabId: number, changeInfo: any) => {
              if (updatedTabId === tab.id && changeInfo.status === 'complete') {
                browser.tabs.onUpdated.removeListener(listener)
                resolve(void 0)
              }
            }
            browser.tabs.onUpdated.addListener(listener)
          })
        }
      }
    }

    if (tabs.length > 0) {
      await browser.tabs.update(tabs[tabs.length - 1].id!, { active: true })
      localMessage.value = `已成功打开 ${tabs.length} 个iframe`
    }
    else {
      localMessage.value = '没有找到可用的iframe URL'
    }
  }
  catch {
    localMessage.value = '打开iframe时发生错误'
  }
}

// 处理iframe跳转
function handleIframeNavigate(iframe: IframeInfo) {
  const content = iframe.updatedUrl || iframe.hashContent || ''

  if (content) {
    emit('copyContent', content)
    navigateToHost(content)
  }
}

// 暴露状态和方法
defineExpose({
  isProcessing,
  message: localMessage,
  iframeList,
  selectedIframe,
  detectIframes,
  blockAds,
})
</script>

<template>
  <div class="space-y-4">
    <!-- 主要操作区域 -->
    <div>
      <button
        class="w-full py-3 px-4 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
        :class="isProcessing
          ? 'bg-gray-400 cursor-not-allowed'
          : 'bg-gray-900 hover:bg-black shadow-sm hover:shadow-md active:scale-[0.99]'"
        :disabled="isProcessing"
        @click="detectIframes"
      >
        <svg v-if="isProcessing" class="animate-spin w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <svg v-else class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span>{{ isProcessing ? '正在检测页面...' : '检测页面 iframe' }}</span>
      </button>
    </div>

    <!-- iframe 列表 -->
    <div v-if="iframeList.length" class="space-y-2">
      <div class="flex items-center justify-between px-1">
        <label class="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          发现 {{ iframeList.length }} 个 iframe
        </label>
        <button
          class="text-xs px-2.5 py-1 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded transition-all duration-200 flex items-center gap-1 shadow-sm"
          title="在新标签页中打开所有检测到的iframe"
          @click="openAllIframes"
        >
          <svg class="w-3 h-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          打开全部
        </button>
      </div>

      <div class="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div class="max-h-64 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 divide-y divide-gray-100">
          <div
            v-for="iframe in iframeList"
            :key="iframe.index"
            class="group relative px-4 py-3 hover:bg-gray-50 transition-colors duration-200 cursor-pointer"
            :class="{ 'bg-gray-50': selectedIframe?.index === iframe.index }"
            @click="selectIframe(iframe)"
          >
            <div class="flex items-center justify-between mb-1">
              <span class="font-medium text-sm text-gray-700">Frame #{{ iframe.index + 1 }}</span>
              <div class="flex items-center gap-1.5">
                <span
                  v-if="iframe.hashContent"
                  class="w-2 h-2 rounded-full bg-green-500 ring-4 ring-green-50"
                  title="包含hash内容"
                />
                <span
                  v-if="iframe.openKeyResult?.success"
                  class="w-2 h-2 rounded-full bg-blue-500 ring-4 ring-blue-50"
                  title="openKey获取成功"
                />
                <span
                  v-if="iframe.openKeyResult && !iframe.openKeyResult.success"
                  class="w-2 h-2 rounded-full bg-red-500 ring-4 ring-red-50"
                  title="openKey获取失败"
                />
              </div>
            </div>

            <div class="text-xs text-gray-500 truncate pr-8 font-mono">
              {{ iframe.hashContent || '无 Hash 内容' }}
            </div>

            <!-- 跳转按钮 -->
            <button
              v-if="iframe.updatedUrl || iframe.hashContent"
              class="absolute right-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              :title="iframe.updatedUrl ? '跳转到更新后的URL' : '跳转到配置的host'"
              @click.stop="handleIframeNavigate(iframe)"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
