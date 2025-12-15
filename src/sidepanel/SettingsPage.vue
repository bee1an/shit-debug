<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import BaseInput from './components/BaseInput.vue'
import { usePopupSettings } from '~/composables/usePopupSettings'

// 定义事件
const emit = defineEmits<{
  back: []
}>()

// 使用设置管理composable
const {
  settings,
  updateHostPrefix,
  resetToDefault,
  initSettings,
} = usePopupSettings()

// 本地状态
const hostInput = ref('')
const isSaving = ref(false)
const saveMessage = ref('')
const errorMessage = ref('')

// 监听settings变化，同步到输入框
watch(() => settings.value.hostPrefix, (newHostPrefix) => {
  hostInput.value = newHostPrefix
}, { immediate: true })

// 初始化
onMounted(async () => {
  await initSettings()
})

/**
 * 保存配置
 */
async function handleSave() {
  if (isSaving.value)
    return

  errorMessage.value = ''
  saveMessage.value = ''
  isSaving.value = true

  try {
    await updateHostPrefix(hostInput.value.trim())
    saveMessage.value = '配置已保存成功'

    // 2秒后返回主页面
    setTimeout(() => {
      emit('back')
    }, 2000)
  }
  catch {
    errorMessage.value = '保存失败，请重试'
  }
  finally {
    isSaving.value = false
  }
}

/**
 * 重置为默认配置
 */
async function handleReset() {
  if (isSaving.value)
    return

  errorMessage.value = ''
  saveMessage.value = ''
  isSaving.value = true

  try {
    await resetToDefault()
    saveMessage.value = '已重置为默认配置'
  }
  catch {
    errorMessage.value = '重置失败，请重试'
  }
  finally {
    isSaving.value = false
  }
}

/**
 * 返回主页面
 */
function handleBack() {
  emit('back')
}

/**
 * 处理键盘事件
 */
function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    handleSave()
  }
  else if (event.key === 'Escape') {
    handleBack()
  }
}
</script>

<template>
  <main class="h-full bg-gray-50 flex flex-col font-sans animate-fade-in">
    <!-- 页面头部 -->
    <div class="px-4 py-3 bg-white border-b border-gray-100 flex items-center gap-3">
      <button
        class="p-2 -ml-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all duration-200"
        title="返回主页面"
        @click="handleBack"
      >
        <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <h1 class="text-lg font-semibold text-gray-900">
        设置
      </h1>
    </div>

    <!-- 设置内容 -->
    <div class="flex-1 overflow-y-auto p-4 space-y-6">
      <!-- Host前缀配置 -->
      <section>
        <div class="mb-2 px-1 text-sm font-medium text-gray-500">
          基础配置
        </div>
        <div class="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-4">
          <div class="space-y-2">
            <label class="block text-sm font-medium text-gray-700">
              Host 前缀
            </label>
            <BaseInput
              v-model="hostInput"
              type="url"
              placeholder="例如: http://localhost:3000"
              class="w-full"
              :error="!!errorMessage"
              :disabled="isSaving"
              @keydown="handleKeydown"
            />
            <p class="text-xs text-gray-400">
              用于构建 iframe 跳转的完整 URL
            </p>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-3 pt-2">
            <button
              class="flex-1 py-2.5 px-4 rounded-lg font-medium text-white transition-all duration-200 flex items-center justify-center gap-2"
              :class="isSaving
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gray-900 hover:bg-black shadow-sm hover:shadow-md active:scale-[0.99]'"
              :disabled="isSaving || !hostInput.trim()"
              @click="handleSave"
            >
              <svg v-if="isSaving" class="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <svg v-else class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>{{ isSaving ? '保存中...' : '保存配置' }}</span>
            </button>

            <button
              class="px-4 py-2.5 bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg transition-all duration-200 shadow-sm flex items-center justify-center gap-2 min-w-[5rem]"
              :disabled="isSaving"
              @click="handleReset"
            >
              <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>重置</span>
            </button>
          </div>
        </div>
      </section>

      <!-- 消息提示 -->
      <Transition
        name="message-slide"
        appear
      >
        <div
          v-if="saveMessage || errorMessage"
          class="p-4 rounded-xl text-sm shadow-sm border relative overflow-hidden animate-fade-in"
          :class="saveMessage ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'"
        >
          <div class="flex items-start gap-3">
            <div class="flex-shrink-0 mt-0.5">
              <svg
                v-if="saveMessage"
                class="w-5 h-5 text-green-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <svg
                v-else
                class="w-5 h-5 text-red-500"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div class="flex-1 font-medium">
              {{ saveMessage || errorMessage }}
            </div>
          </div>
        </div>
      </Transition>
    </div>
  </main>
</template>

<style scoped>
/* 页面加载动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

/* 消息提示动画 */
.message-slide-enter-active {
  transition: all 0.3s ease-out;
}

.message-slide-leave-active {
  transition: all 0.2s ease-in;
}

.message-slide-enter-from {
  opacity: 0;
  transform: translateY(-10px);
}

.message-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>
