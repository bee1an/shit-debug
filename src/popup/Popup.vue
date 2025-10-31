<script setup lang="ts">
import { ref } from 'vue'
import type { Tabs } from 'webextension-polyfill'
import { useIframeDetector } from '~/composables/useIframeDetector'
import { getArrayFromStorage, saveArrayToStorage } from '~/utils/storage'

const { isProcessing, message, copiedContent, sessionStorageData, iframeList, selectedIframe, handleIframeDetection, selectIframe } = useIframeDetector()

// 新功能：搜索和点击li元素
const searchInput = ref('')
const searchHistory = ref<string[]>([])
const currentHistoryIndex = ref(-1)

// 历史记录列表相关状态
const showHistoryList = ref(true) // 默认显示历史记录列表
const isHistoryListExpanded = ref(false) // 历史记录列表是否展开
const historyListMaxItems = 10 // 最多显示10条历史记录

// 历史记录项接口
interface SearchHistoryItem {
  text: string
}

// 获取格式化的历史记录列表
function getFormattedHistoryList(): SearchHistoryItem[] {
  return searchHistory.value.slice(0, historyListMaxItems).map(text => ({
    text,
  }))
}

// 加载搜索历史缓存
async function loadSearchHistory() {
  searchHistory.value = await getArrayFromStorage<string>('li-search-history')

  // 显示最后一条历史记录
  if (searchHistory.value.length > 0) {
    searchInput.value = searchHistory.value[0]
  }
}

// 处理输入框获得焦点时全选内容
function _handleInputFocus(event: FocusEvent) {
  const target = event.target as HTMLInputElement
  target.select()
}

// 切换历史记录列表展开/收起状态
function toggleHistoryList() {
  isHistoryListExpanded.value = !isHistoryListExpanded.value
}

// 点击历史记录项
function selectHistoryItem(item: SearchHistoryItem) {
  searchInput.value = item.text
  isHistoryListExpanded.value = false
  searchAndClickLi()
}

// 删除单个历史记录项
async function deleteHistoryItem(item: SearchHistoryItem, event: MouseEvent) {
  event.stopPropagation() // 阻止事件冒泡

  const index = searchHistory.value.indexOf(item.text)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
    await saveArrayToStorage('li-search-history', searchHistory.value)
    // 如果删除的是当前显示在输入框的值，清空输入框
    if (searchInput.value === item.text) {
      searchInput.value = searchHistory.value.length > 0 ? searchHistory.value[0] : ''
    }
  }
}

// 清空所有历史记录
async function clearAllHistory() {
  searchHistory.value = []
  await browser.storage.local.remove(['li-search-history'])
  isHistoryListExpanded.value = false
}

// 点击页面其他地方时收起历史记录列表
function handleClickOutside() {
  isHistoryListExpanded.value = false
}

// 保存搜索历史到缓存
async function saveSearchHistory() {
  if (searchInput.value && !searchHistory.value.includes(searchInput.value)) {
    searchHistory.value.unshift(searchInput.value)
    // 只保留最新的30条记录
    searchHistory.value = searchHistory.value.slice(0, 30)
    await saveArrayToStorage('li-search-history', searchHistory.value)
  }
}

// 搜索并点击匹配的li元素
async function searchAndClickLi() {
  if (!searchInput.value.trim()) {
    message.value = '请输入要搜索的内容'
    return
  }

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
      args: [searchInput.value.trim()],
    })
      .then((results: unknown) => {
        const result = (results as Array<{ result: { matchedCount: number } }>)[0]?.result
        if (result && result.matchedCount > 0) {
          message.value = `找到匹配的导航并已点击`
          saveSearchHistory()
          currentHistoryIndex.value = -1
        }
        else {
          message.value = `未找到包含 "${searchInput.value}" 的导航`
        }
      })
  }
  catch {
    message.value = '搜索失败，请重试'
  }
}

// 处理键盘事件（上下键导航历史记录）
function _handleKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (searchHistory.value.length > 0 && currentHistoryIndex.value < searchHistory.value.length - 1) {
      currentHistoryIndex.value++
      searchInput.value = searchHistory.value[currentHistoryIndex.value]
    }
  }
  else if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (currentHistoryIndex.value > 0) {
      currentHistoryIndex.value--
      searchInput.value = searchHistory.value[currentHistoryIndex.value]
    }
    else if (currentHistoryIndex.value === 0) {
      currentHistoryIndex.value = -1
      searchInput.value = ''
    }
  }
  else if (event.key === 'Enter' && event.target === event.currentTarget) {
    event.preventDefault()
    isHistoryListExpanded.value = false
    searchAndClickLi()
  }
  else if (event.key === 'Escape') {
    isHistoryListExpanded.value = false
  }
}

// 初始化加载历史记录
loadSearchHistory()

async function blockAds() {
  try {
    const expireTime = Math.floor((Date.now() + (8 * 60 * 60 * 1000)) / 1000) // 当前时间+8小时的时间戳
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

async function navigateToLocalhost() {
  if (!copiedContent.value)
    return

  const url = `http://localhost:4000${copiedContent.value}`
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

  if (sessionStorageData.value) {
    try {
      await browser.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data: any) => {
          sessionStorage.setItem('SET_LOGIN_DATA', typeof data === 'object' ? JSON.stringify(data) : data)
        },
        args: [sessionStorageData.value],
      })
    }
    catch {
      // 注入失败
    }
  }

  await browser.tabs.update(tab.id, { active: true })
}

async function openAllIframes() {
  if (!iframeList.value.length) {
    message.value = '没有可打开的iframe'
    return
  }

  message.value = `正在打开 ${iframeList.value.length} 个iframe...`

  try {
    const tabs: Tabs.Tab[] = []

    for (const iframe of iframeList.value) {
      if (iframe.hashContent) {
        const url = `http://localhost:4000${iframe.hashContent}`
        const tab = await browser.tabs.create({ url, active: false })

        if (tab.id) {
          tabs.push(tab)

          // 等待页面加载完成
          await new Promise((resolve) => {
            const listener = (updatedTabId: number, changeInfo: any) => {
              if (updatedTabId === tab.id && changeInfo.status === 'complete') {
                browser.tabs.onUpdated.removeListener(listener)
                resolve(void 0)
              }
            }
            browser.tabs.onUpdated.addListener(listener)
          })

          // 如果有sessionStorage数据，注入到页面
          if (iframe.sessionStorageData) {
            try {
              await browser.scripting.executeScript({
                target: { tabId: tab.id },
                func: (data: any) => {
                  sessionStorage.setItem('SET_LOGIN_DATA', typeof data === 'object' ? JSON.stringify(data) : data)
                },
                args: [iframe.sessionStorageData],
              })
            }
            catch {
              // 注入失败，继续处理下一个
            }
          }
        }
      }
    }

    // 打开最后一个标签页
    if (tabs.length > 0) {
      await browser.tabs.update(tabs[tabs.length - 1].id!, { active: true })
      message.value = `已成功打开 ${tabs.length} 个iframe`
    }
    else {
      message.value = '没有找到包含hash内容的iframe'
    }
  }
  catch {
    message.value = '打开iframe时发生错误'
  }
}
</script>

<template>
  <main class="w-[380px] px-6 py-6 text-center" style="background-color: rgb(250, 249, 245); color: rgb(20, 20, 19); font-family: 'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;" @click="handleClickOutside">
    <!-- <Logo /> -->
    <div class="space-y-5">
      <!-- 搜索功能区域 -->
      <div class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm relative">
        <div class="flex gap-2 ">
          <input
            v-model="searchInput"
            type="text"
            placeholder="输入要搜索的导航内容"
            class="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200"
            style="background-color: rgb(250, 249, 245); color: rgb(20, 20, 19); border-radius: 7.5px;"
            @keydown="_handleKeydown"
            @focus="_handleInputFocus"
          >
          <button
            class="px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 flex items-center justify-center"
            style="color: rgb(20, 20, 19); border-radius: 7.5px;"
            @click="searchAndClickLi"
          >
            <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
        </div>

        <div class="mt-2 text-xs" style="color: rgb(94, 93, 89);">
          使用上下键浏览历史记录
        </div>

        <!-- 历史记录列表 -->
        <div
          v-if="showHistoryList && getFormattedHistoryList().length > 0"
          class="mt-2 bg-white border border-gray-200 rounded-lg shadow-sm"
          style="border-radius: 7.5px;"
          @click.stop
        >
          <!-- 历史记录列表头部 -->
          <div
            class="p-2 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors duration-200"
            @click="toggleHistoryList"
          >
            <span class="text-xs font-medium" style="color: rgb(94, 93, 89);">
              搜索历史 ({{ isHistoryListExpanded ? getFormattedHistoryList().length : '1' }}/{{ getFormattedHistoryList().length }})
            </span>
            <div class="flex items-center gap-2">
              <button
                class="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors duration-200"
                @click.stop="clearAllHistory"
              >
                清空全部
              </button>
              <svg
                class="w-4 h-4 transition-transform duration-200"
                :class="{ 'rotate-180': isHistoryListExpanded }"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                style="color: rgb(94, 93, 89);"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          <!-- 历史记录列表内容 -->
          <div
            class="overflow-hidden transition-all duration-300 scrollbar-hide"
            :class="{ 'overflow-y-auto': isHistoryListExpanded }"
            :style="{
              maxHeight: isHistoryListExpanded ? '240px' : '60px',
            }"
          >
            <div class="py-1">
              <div
                v-for="(item, index) in (isHistoryListExpanded ? getFormattedHistoryList() : getFormattedHistoryList().slice(0, 1))"
                :key="index"
                class="group px-3 py-2 hover:bg-gray-50 cursor-pointer flex items-center justify-between transition-colors duration-200"
                @click="selectHistoryItem(item)"
              >
                <div class="flex-1 min-w-0">
                  <div class="text-sm truncate" style="color: rgb(20, 20, 19);">
                    {{ item.text }}
                  </div>
                </div>
                <button
                  class="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:bg-red-50 rounded transition-all duration-200"
                  @click="deleteHistoryItem(item, $event)"
                >
                  <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主要操作区域 -->
      <div class="space-y-3">
        <!-- 主要按钮：iframe检测 -->
        <button
          class="w-full py-4 px-4 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
          style="background: linear-gradient(135deg, rgb(54, 54, 53) 0%, rgb(84, 84, 83) 100%); border-radius: 10px;"
          :disabled="isProcessing"
          @click="handleIframeDetection"
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

      <div
        v-if="message"
        class="p-4 rounded-2xl text-sm break-words shadow-lg border-2 relative overflow-hidden"
        :style="{
          backgroundColor: message.includes('已复制') || message.includes('成功') ? 'rgb(240, 253, 244)'
            : message.includes('正在检测') ? 'rgb(239, 246, 255)'
              : message.includes('找到') && !message.includes('复制') ? 'rgb(254, 252, 232)'
                : 'rgb(254, 242, 242)',
          borderColor: message.includes('已复制') || message.includes('成功') ? 'rgb(34, 197, 94)'
            : message.includes('正在检测') ? 'rgb(59, 130, 246)'
              : message.includes('找到') && !message.includes('复制') ? 'rgb(250, 204, 21)'
                : 'rgb(239, 68, 68)',
        }"
      >
        <!-- 状态指示条 -->
        <div
          class="absolute top-0 left-0 right-0 h-1"
          :style="{
            backgroundColor: message.includes('已复制') || message.includes('成功') ? 'rgb(34, 197, 94)'
              : message.includes('正在检测') ? 'rgb(59, 130, 246)'
                : message.includes('找到') && !message.includes('复制') ? 'rgb(250, 204, 21)'
                  : 'rgb(239, 68, 68)',
          }"
        />

        <div class="flex items-start">
          <!-- 动态图标 -->
          <div class="mr-3 mt-0.5 flex-shrink-0">
            <svg
              v-if="message.includes('已复制') || message.includes('成功')"
              class="w-5 h-5 text-green-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <svg
              v-else-if="message.includes('正在检测')"
              class="w-5 h-5 text-blue-600 animate-pulse"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <svg
              v-else-if="message.includes('找到') && !message.includes('复制')"
              class="w-5 h-5 text-yellow-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            <svg
              v-else
              class="w-5 h-5 text-red-600"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <!-- 消息内容 -->
          <div class="flex-1">
            <div
              class="font-medium"
              :style="{
                color: message.includes('已复制') || message.includes('成功') ? 'rgb(22, 101, 52)'
                  : message.includes('正在检测') ? 'rgb(37, 99, 235)'
                    : message.includes('找到') && !message.includes('复制') ? 'rgb(161, 98, 7)'
                      : 'rgb(185, 28, 28)',
              }"
            >
              {{ message }}
            </div>
          </div>
        </div>
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
                  v-if="iframe.sessionStorageData"
                  class="w-2 h-2 rounded-full"
                  style="background-color: rgb(59, 130, 246);"
                  title="包含sessionStorage数据"
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
              v-if="iframe.hashContent"
              class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1.5 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-50"
              style="color: rgb(20, 20, 19);"
              :title="iframe.sessionStorageData ? '跳转并传递登录数据' : '跳转到 localhost:4000'"
              @click.stop="() => { copiedContent = iframe.hashContent || ''; navigateToLocalhost(); }"
            >
              <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.scrollbar-hide {
  -ms-overflow-style: none;  /* Internet Explorer 10+ */
  scrollbar-width: none;  /* Firefox */
}
.scrollbar-hide::-webkit-scrollbar {
  display: none;  /* Safari and Chrome */
}
</style>
