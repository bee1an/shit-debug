<script setup lang="ts">
import { onMounted, ref } from 'vue'
import SearchComponent from './components/SearchComponent.vue'
import IframeComponent from './components/IframeComponent.vue'
import MessageComponent from './components/MessageComponent.vue'
import SettingsPage from './SettingsPage.vue'
import { usePopupSettings } from '~/composables/usePopupSettings'

// 页面状态管理
const currentView = ref<'main' | 'settings'>('main')

// 使用设置管理composable
const { initSettings } = usePopupSettings()

// 组件引用
const searchComponentRef = ref<InstanceType<typeof SearchComponent>>()
const iframeComponentRef = ref<InstanceType<typeof IframeComponent>>()

// 统一消息状态
const message = ref('')

// 广告屏蔽功能
async function blockAds() {
  try {
    const expireTime = Math.floor((Date.now() + (8 * 60 * 60 * 1000)) / 1000)
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

// 搜索功能处理
async function handleSearch(query: string) {
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
      args: [query],
    })
      .then((results: unknown) => {
        const result = (results as Array<{ result: { matchedCount: number } }>)[0]?.result
        if (result && result.matchedCount > 0) {
          message.value = `找到匹配的导航并已点击`
        }
        else {
          message.value = `未找到包含 "${query}" 的导航`
        }
      })
  }
  catch {
    message.value = '搜索失败，请重试'
  }
}

// 复制内容处理
function handleCopyContent(_content: string) {
  // 这里可以添加复制到剪贴板的逻辑
  // console.log('Copy content:', content)
}

// 导航到设置页面
function navigateToSettings() {
  currentView.value = 'settings'
}

// 从设置页面返回
function handleBackFromSettings() {
  currentView.value = 'main'
}

// 点击页面其他地方处理
function handleClickOutside() {
  if (searchComponentRef.value) {
    searchComponentRef.value.handleClickOutside()
  }
}

// 初始化
onMounted(async () => {
  await initSettings()
})
</script>

<template>
  <main
    class="w-[380px] px-6 py-6 text-center relative overflow-hidden"
    style="background-color: rgb(250, 249, 245); color: rgb(20, 20, 19); font-family: 'Anthropic Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;"
    @click="handleClickOutside"
  >
    <!-- 页面容器 -->
    <div class="relative">
      <!-- 主页面 -->
      <Transition
        name="slide-fade"
        mode="out-in"
        appear
      >
        <div
          v-if="currentView === 'main'"
          key="main"
          class="space-y-5"
        >
          <!-- 搜索功能组件 -->
          <div class="animate-slide-up" style="animation-delay: 100ms;">
            <SearchComponent
              ref="searchComponentRef"
              @search="handleSearch"
            />
          </div>

          <!-- iframe功能组件 -->
          <div class="animate-slide-up" style="animation-delay: 200ms;">
            <IframeComponent
              ref="iframeComponentRef"
              @copy-content="handleCopyContent"
            />
          </div>

          <!-- 统一消息组件 -->
          <div class="animate-fade-in" style="animation-delay: 300ms;">
            <MessageComponent :message="message" />
          </div>

          <!-- 操作按钮区域 -->
          <div class="flex justify-end gap-2 animate-fade-in" style="animation-delay: 400ms;">
            <!-- 屏蔽广告按钮 -->
            <button
              class="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 opacity-60 hover:opacity-100"
              style="color: rgb(20, 20, 19);"
              title="屏蔽广告弹窗"
              @click="blockAds"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </button>

            <!-- 设置按钮 -->
            <button
              class="p-2 hover:bg-gray-100 rounded-lg transition-all duration-200 opacity-60 hover:opacity-100"
              style="color: rgb(20, 20, 19);"
              title="设置"
              @click="navigateToSettings"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        <!-- 设置页面 -->
        <SettingsPage
          v-else-if="currentView === 'settings'"
          key="settings"
          @back="handleBackFromSettings"
        />
      </Transition>
    </div>
  </main>
</template>

<style scoped>
/* 页面切换动画 */
.slide-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

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

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fade-in {
  animation: fadeIn 0.4s ease-out forwards;
}

.animate-slide-up {
  animation: slideUp 0.4s ease-out forwards;
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
    rgba(59, 130, 246, 0.05) 0%,
    rgba(34, 197, 94, 0.05) 50%,
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
