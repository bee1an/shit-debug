<script setup lang="ts">
import { useIframeDetector } from '~/composables/useIframeDetector'

// Chrome API类型声明
declare const chrome: {
  scripting: {
    executeScript: (params: {
      target: { tabId: number }
      func: (...args: any[]) => any
      args?: any[]
    }) => Promise<Array<{ result: any }>>
  }
}

const { isProcessing, message, copiedContent, sessionStorageData, handleIframeDetection } = useIframeDetector()

async function blockAds() {
  try {
    const expireTime = Math.floor((Date.now() + (8 * 60 * 60 * 1000)) / 1000) // 当前时间+8小时的时间戳
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true })

    if (!tab.id) {
      message.value = '无法获取当前标签页信息'
      return
    }

    await chrome.scripting.executeScript({
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
      await chrome.scripting.executeScript({
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
</script>

<template>
  <main class="w-[350px] px-4 py-5 text-center text-gray-700">
    <Logo />
    <div class="text-lg font-semibold mb-2">
      shit debug
    </div>
    <div class="text-sm mb-2 text-gray-500">
      仅在页面只有一个iframe时生效
    </div>
    <div class="mt-4 space-y-3">
      <button
        class="btn w-full py-2 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isProcessing"
        @click="handleIframeDetection"
      >
        <span v-if="isProcessing" class="flex items-center justify-center">
          <svg class="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          检测中...
        </span>
        <span v-else>检测页面 iframe</span>
      </button>

      <button
        class="btn w-full py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors duration-200"
        @click="blockAds"
      >
        <span class="flex items-center justify-center">
          <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
          屏蔽广告
        </span>
      </button>

      <div
        v-if="message"
        class="p-3 rounded-lg text-sm break-words"
        :class="{
          'bg-green-50 text-green-700 border border-green-200': message.includes('已复制') || message.includes('成功'),
          'bg-blue-50 text-blue-700 border border-blue-200': message.includes('正在检测'),
          'bg-yellow-50 text-yellow-700 border border-yellow-200': message.includes('找到') && !message.includes('复制'),
          'bg-red-50 text-red-700 border border-red-200': message.includes('没有找到') || message.includes('错误') || message.includes('失败'),
        }"
      >
        {{ message }}
      </div>

      <div
        v-if="copiedContent"
        class="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg"
      >
        <div class="text-xs text-gray-500 mb-1">
          复制的内容:
        </div>
        <div class="text-sm font-mono text-gray-800 break-all p-2 bg-white rounded border">
          {{ copiedContent }}
        </div>

        <div
          v-if="sessionStorageData"
          class="mt-3 p-2 bg-blue-50 border border-blue-200 rounded"
        >
          <div class="text-xs text-blue-600 mb-1">
            iframe中的SET_LOGIN_DATA:
          </div>
          <div class="text-xs font-mono text-blue-800 break-all">
            {{
              typeof sessionStorageData === 'object'
                ? JSON.stringify(sessionStorageData, null, 2)
                : sessionStorageData
            }}
          </div>
        </div>

        <button
          class="btn mt-3 w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors duration-200 flex items-center justify-center"
          :disabled="!copiedContent"
          @click="navigateToLocalhost"
        >
          <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          {{ sessionStorageData ? '跳转并传递登录数据' : '跳转到 localhost:4000' }}
        </button>
      </div>
    </div>
  </main>
</template>
