<script setup lang="ts">
import { ref, watch } from 'vue'
import type { Tabs } from 'webextension-polyfill'
import { useIframeDetector } from '~/composables/useIframeDetector'
import { usePopupSettings } from '~/composables/usePopupSettings'

// 定义事件
const emit = defineEmits<{
  'copy-content': [content: string]
}>()

// 使用iframe检测composable
const {
  isProcessing,
  message,
  copiedContent,
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
async function navigateToHost() {
  if (!copiedContent.value)
    return

  const url = buildUrl(copiedContent.value)
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
function handleIframeNavigate(iframe: any) {
  const content = iframe.updatedUrl || iframe.hashContent || ''
  if (content) {
    // eslint-disable-next-line vue/custom-event-name-casing
    emit('copy-content', content)
    navigateToHost()
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
  <div class="space-y-5">
    <!-- 主要操作区域 -->
    <div class="space-y-3">
      <!-- 主要按钮：iframe检测 -->
      <button
        class="w-full py-4 px-4 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
        style="background: linear-gradient(135deg, rgb(54, 54, 53) 0%, rgb(84, 84, 83) 100%); border-radius: 10px;"
        :disabled="isProcessing"
        @click="detectIframes"
      >
        <span v-if="isProcessing" class="flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span class="font-medium">正在检测页面...</span>
        </span>
        <span v-else class="flex items-center justify-center">
          <svg class="w-5 h-5 mr-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span class="font-medium">检测页面 iframe</span>
        </span>
      </button>

      <!-- 次要操作按钮 -->
      <button
        class="w-full py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
        style="color: rgb(20, 20, 19); border-radius: 7.5px;"
        @click="blockAds"
      >
        <span class="flex items-center justify-center">
          <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          <span class="font-medium">屏蔽广告弹窗</span>
        </span>
      </button>
    </div>

    <!-- iframe 列表 -->
    <div
      v-if="iframeList.length"
      class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm"
      style="border-radius: 7.5px;"
    >
      <div class="flex items-center justify-between mb-3">
        <div class="text-sm font-medium" style="color: rgb(20, 20, 19); font-weight: 500;">
          选择 iframe ({{ iframeList.length }} 个)
        </div>
        <button
          class="text-xs px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center"
          style="color: rgb(20, 20, 19);"
          title="在新标签页中打开所有检测到的iframe"
          @click="openAllIframes"
        >
          <svg class="w-3 h-3 mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
          </svg>
          打开全部
        </button>
      </div>
      <div class="space-y-2 max-h-48 overflow-y-auto">
        <div
          v-for="iframe in iframeList"
          :key="iframe.index"
          class="group relative px-3 py-2 text-left text-sm border rounded-lg transition-all duration-200 cursor-pointer"
          :class="{
            'border-blue-200': selectedIframe?.index === iframe.index,
            'border-gray-200 hover:border-gray-300': selectedIframe?.index !== iframe.index,
          }"
          :style="{
            backgroundColor: selectedIframe?.index === iframe.index ? 'rgb(250, 249, 245)' : 'white',
            color: 'rgb(20, 20, 19)',
          }"
          @click="selectIframe(iframe)"
        >
          <div class="flex items-center justify-between">
            <span class="font-medium">iframe {{ iframe.index + 1 }}</span>
            <div class="flex items-center gap-1">
              <span
                v-if="iframe.hashContent"
                class="w-2 h-2 rounded-full"
                style="background-color: rgb(34, 197, 94);"
                title="包含hash内容"
              />
              <span
                v-if="iframe.openKeyResult?.success"
                class="w-2 h-2 rounded-full"
                style="background-color: rgb(59, 130, 246);"
                title="openKey获取成功"
              />
              <span
                v-if="iframe.openKeyResult && !iframe.openKeyResult.success"
                class="w-2 h-2 rounded-full"
                style="background-color: rgb(239, 68, 68);"
                title="openKey获取失败"
              />
            </div>
          </div>
          <div
            v-if="iframe.hashContent"
            class="mt-1 text-xs truncate"
            style="color: rgb(94, 93, 89);"
            :title="iframe.hashContent"
          >
            {{ iframe.hashContent }}
          </div>
          <div
            v-else
            class="mt-1 text-xs"
            style="color: rgb(154, 153, 150);"
          >
            无hash内容
          </div>

          <!-- Hover时显示的跳转按钮 -->
          <button
            v-if="iframe.updatedUrl || iframe.hashContent"
            class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50"
            style="color: rgb(20, 20, 19);"
            :title="iframe.updatedUrl ? '跳转到更新后的URL' : '跳转到配置的host'"
            @click.stop="handleIframeNavigate(iframe)"
          >
            <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
