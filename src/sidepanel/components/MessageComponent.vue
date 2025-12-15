<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  message: string
}

const props = defineProps<Props>()

// 状态类型
type MessageStatus = 'success' | 'loading' | 'search' | 'error' | 'none'

// 计算图标类型和状态
const status = computed<MessageStatus>(() => {
  if (!props.message)
    return 'none'

  if (props.message.includes('已复制') || props.message.includes('成功')) {
    return 'success'
  }
  else if (props.message.includes('正在检测')) {
    return 'loading'
  }
  else if (props.message.includes('找到') && !props.message.includes('复制')) {
    return 'search'
  }
  else {
    return 'error'
  }
})

// 根据状态返回样式类
const wrapperClasses = computed(() => {
  switch (status.value) {
    case 'success':
      return 'bg-green-50 border-green-200 text-green-700'
    case 'loading':
      return 'bg-blue-50 border-blue-200 text-blue-700'
    case 'search':
      return 'bg-yellow-50 border-yellow-200 text-yellow-700'
    case 'error':
      return 'bg-red-50 border-red-200 text-red-700'
    default:
      return ''
  }
})

const iconClasses = computed(() => {
  switch (status.value) {
    case 'success':
      return 'text-green-500'
    case 'loading':
      return 'text-blue-500'
    case 'search':
      return 'text-yellow-500'
    case 'error':
      return 'text-red-500'
    default:
      return ''
  }
})

const indicatorClasses = computed(() => {
  switch (status.value) {
    case 'success':
      return 'bg-green-500'
    case 'loading':
      return 'bg-blue-500'
    case 'search':
      return 'bg-yellow-500'
    case 'error':
      return 'bg-red-500'
    default:
      return ''
  }
})
</script>

<template>
  <div
    v-if="message"
    class="relative overflow-hidden rounded-xl border p-4 shadow-sm transition-all duration-300 animate-fade-in"
    :class="wrapperClasses"
  >
    <!-- 状态指示条 -->
    <div
      class="absolute left-0 top-0 h-full w-1"
      :class="indicatorClasses"
    />

    <div class="flex items-center gap-3 pl-2">
      <!-- 动态图标 -->
      <div class="flex-shrink-0">
        <!-- 成功图标 -->
        <svg
          v-if="status === 'success'"
          class="h-5 w-5"
          :class="iconClasses"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <!-- 加载图标 -->
        <svg
          v-else-if="status === 'loading'"
          class="h-5 w-5 animate-spin"
          :class="iconClasses"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>

        <!-- 搜索图标 -->
        <svg
          v-else-if="status === 'search'"
          class="h-5 w-5"
          :class="iconClasses"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>

        <!-- 错误图标 -->
        <svg
          v-else
          class="h-5 w-5"
          :class="iconClasses"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <!-- 消息内容 -->
      <div class="flex-1 text-sm font-medium break-all leading-tight">
        {{ message }}
      </div>
    </div>
  </div>
</template>
