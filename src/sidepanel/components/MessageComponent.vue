<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  message: string
}

const props = defineProps<Props>()

// 计算消息样式
const messageStyle = computed(() => {
  if (!props.message)
    return {}

  let backgroundColor = 'rgb(254, 242, 242)'
  let borderColor = 'rgb(239, 68, 68)'
  let iconColor = 'rgb(185, 28, 28)'
  let statusColor = 'rgb(239, 68, 68)'

  if (props.message.includes('已复制') || props.message.includes('成功')) {
    backgroundColor = 'rgb(240, 253, 244)'
    borderColor = 'rgb(34, 197, 94)'
    iconColor = 'rgb(22, 101, 52)'
    statusColor = 'rgb(34, 197, 94)'
  }
  else if (props.message.includes('正在检测')) {
    backgroundColor = 'rgb(239, 246, 255)'
    borderColor = 'rgb(59, 130, 246)'
    iconColor = 'rgb(37, 99, 235)'
    statusColor = 'rgb(59, 130, 246)'
  }
  else if (props.message.includes('找到') && !props.message.includes('复制')) {
    backgroundColor = 'rgb(254, 252, 232)'
    borderColor = 'rgb(250, 204, 21)'
    iconColor = 'rgb(161, 98, 7)'
    statusColor = 'rgb(250, 204, 21)'
  }

  return {
    backgroundColor,
    borderColor,
    iconColor,
    statusColor,
  }
})

// 计算图标类型
const iconType = computed(() => {
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
</script>

<template>
  <div
    v-if="message"
    class="p-4 rounded-2xl text-sm break-words shadow-lg border-2 relative overflow-hidden"
    :style="{
      backgroundColor: messageStyle.backgroundColor,
      borderColor: messageStyle.borderColor,
    }"
  >
    <!-- 状态指示条 -->
    <div
      class="absolute top-0 left-0 right-0 h-1"
      :style="{ backgroundColor: messageStyle.statusColor }"
    />

    <div class="flex items-start">
      <!-- 动态图标 -->
      <div class="mr-3 mt-0.5 flex-shrink-0">
        <!-- 成功图标 -->
        <svg
          v-if="iconType === 'success'"
          class="w-5 h-5"
          :style="{ color: messageStyle.iconColor }"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>

        <!-- 加载图标 -->
        <svg
          v-else-if="iconType === 'loading'"
          class="w-5 h-5 animate-pulse"
          :style="{ color: messageStyle.iconColor }"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>

        <!-- 搜索图标 -->
        <svg
          v-else-if="iconType === 'search'"
          class="w-5 h-5"
          :style="{ color: messageStyle.iconColor }"
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
          class="w-5 h-5"
          :style="{ color: messageStyle.iconColor }"
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
        <div class="font-medium break-all" :style="{ color: messageStyle.iconColor }">
          {{ message }}
        </div>
      </div>
    </div>
  </div>
</template>
