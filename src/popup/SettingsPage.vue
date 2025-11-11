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
  <main class="relative animate-fade-in" style="background-color: rgb(250, 249, 245); color: rgb(20, 20, 19); font-family: 'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    <!-- 页面头部 -->
    <div class="flex items-center justify-between mb-6">
      <div class="flex items-center">
        <button
          class="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110 transform"
          style="color: rgb(20, 20, 19);"
          title="返回主页面"
          @click="handleBack"
        >
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 class="text-xl font-semibold" style="color: rgb(20, 20, 19);">
            设置
          </h1>
        </div>
      </div>
    </div>

    <!-- 设置内容 -->
    <div class="space-y-5">
      <!-- Host前缀配置 -->
      <div class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <!-- 输入表单 -->
        <div class="space-y-4">
          <div>
            <div class="flex items-center gap-3">
              <label class="text-sm font-medium whitespace-nowrap" style="color: rgb(20, 20, 19);">
                Host 前缀
              </label>
              <BaseInput
                v-model="hostInput"
                type="url"
                placeholder="例如: http://localhost:3000"
                class="flex-1"
                :error="!!errorMessage"
                :disabled="isSaving"
                @keydown="handleKeydown"
              />
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="flex gap-3">
            <button
              class="flex-1 py-3 px-4 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]"
              style="background: linear-gradient(135deg, rgb(54, 54, 53) 0%, rgb(84, 84, 83) 100%); border-radius: 10px;"
              :disabled="isSaving || !hostInput.trim()"
              @click="handleSave"
            >
              <span v-if="isSaving" class="flex items-center justify-center">
                <svg class="animate-spin -ml-1 mr-3 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span class="font-medium">保存中...</span>
              </span>
              <span v-else class="flex items-center justify-center">
                <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                </svg>
                <span class="font-medium">保存配置</span>
              </span>
            </button>

            <button
              class="py-3 px-4 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md"
              style="color: rgb(20, 20, 19); border-radius: 7.5px;"
              :disabled="isSaving"
              @click="handleReset"
            >
              <span class="flex items-center justify-center">
                <svg class="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span class="font-medium">重置</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <!-- 消息提示 -->
      <Transition
        name="message-slide"
        appear
      >
        <div
          v-if="saveMessage || errorMessage"
          class="p-4 rounded-2xl text-sm break-words shadow-lg border-2 relative overflow-hidden animate-fade-in"
          :style="{
            backgroundColor: saveMessage ? 'rgb(240, 253, 244)' : 'rgb(254, 242, 242)',
            borderColor: saveMessage ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
          }"
        >
          <!-- 状态指示条 -->
          <div
            class="absolute top-0 left-0 right-0 h-1"
            :style="{
              backgroundColor: saveMessage ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
            }"
          />

          <div class="flex items-start">
            <!-- 动态图标 -->
            <div class="mr-3 mt-0.5 flex-shrink-0">
              <svg
                v-if="saveMessage"
                class="w-5 h-5 text-green-600"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
                  color: saveMessage ? 'rgb(22, 101, 52)' : 'rgb(185, 28, 28)',
                }"
              >
                {{ saveMessage || errorMessage }}
              </div>
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

/* 背景装饰 */
main::before {
  content: '';
  position: absolute;
  top: -50%;
  right: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(
    circle,
    rgba(59, 130, 246, 0.03) 0%,
    rgba(34, 197, 94, 0.03) 50%,
    transparent 100%
  );
  animation: rotate 30s linear infinite;
  pointer-events: none;
  z-index: -1;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
