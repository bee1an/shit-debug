<script setup lang="ts">
import { useIframeDetector } from '~/composables/useIframeDetector'

const { isProcessing, message, handleIframeDetection } = useIframeDetector()
</script>

<template>
  <main class="w-[350px] px-4 py-5 text-center text-gray-700">
    <Logo />
    <div class="text-lg font-semibold mb-4">
      iframe 检测器
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
