<script setup lang="ts">
import { useIframeDetector } from '~/composables/useIframeDetector'

const { isProcessing, message, copiedContent, sessionStorageData, handleIframeDetection } = useIframeDetector()

// 跳转到localhost:4000并传递sessionStorage数据
async function navigateToLocalhost() {
  if (!copiedContent.value) {
    return
  }

  const url = `http://localhost:4000${copiedContent.value}`
  // 先创建新标签页
  const tab = await browser.tabs.create({ url, active: false })

  if (!tab.id) {
    return
  }

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

  // 注入sessionStorage数据到新页面
  if (sessionStorageData.value) {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (data: any) => {
          // 将数据存储到sessionStorage
          sessionStorage.setItem('SET_LOGIN_DATA', typeof data === 'object' ? JSON.stringify(data) : data,
          )

          console.log('SessionStorage数据已注入到新页面:', data)
        },
        args: [sessionStorageData.value],
      })
    }
    catch (error) {
      console.error('注入sessionStorage失败:', error)
    }
  }

  // 激活标签页
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
    <!-- <SharedSubtitle /> -->

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

      <!-- 消息显示区域 -->
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

      <!-- 复制内容展示区域 -->
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

        <!-- sessionStorage数据展示 -->
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

        <!-- 跳转按钮 -->
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

    <!-- <div class="mt-6 pt-4 border-t border-gray-200">
      <button class="btn text-sm text-gray-600 hover:text-gray-800" @click="openOptionsPage">
        打开设置
      </button>
      <div class="mt-2 text-xs text-gray-400">
        <span class="opacity-50">Storage:</span> {{ storageDemo }}
      </div>
    </div> -->
  </main>
</template>
