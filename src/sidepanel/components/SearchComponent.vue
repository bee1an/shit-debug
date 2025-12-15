<script setup lang="ts">
import { ref, watch } from 'vue'
import BaseInput from './BaseInput.vue'
import { useReactiveStorage } from '~/composables/useReactiveStorage'

// 定义事件
const emit = defineEmits<{
  search: [query: string]
}>()

// 搜索相关状态
const searchInput = ref('')
const searchHistory = useReactiveStorage<string>('li-search-history', [])
const currentHistoryIndex = ref(-1)

// 历史记录列表相关状态
const showHistoryList = ref(true)
const isHistoryListExpanded = ref(false)
const historyListMaxItems = 10

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

// 显示最后一条历史记录
function showLatestHistory() {
  if (searchHistory.value.length > 0) {
    searchInput.value = searchHistory.value[0]
  }
}

// 处理输入框获得焦点时全选内容并展开历史
function handleInputFocus(event: FocusEvent) {
  const target = event.target as HTMLInputElement
  target.select()
  if (searchHistory.value.length > 0) {
    isHistoryListExpanded.value = true
  }
}

// 切换历史记录列表展开/收起状态
function toggleHistoryList() {
  isHistoryListExpanded.value = !isHistoryListExpanded.value
}

// 点击历史记录项
function selectHistoryItem(item: SearchHistoryItem) {
  searchInput.value = item.text
  isHistoryListExpanded.value = false
  handleSearch()
}

// 删除单个历史记录项
async function deleteHistoryItem(item: SearchHistoryItem, event: MouseEvent) {
  event.stopPropagation()

  const index = searchHistory.value.indexOf(item.text)
  if (index > -1) {
    searchHistory.value.splice(index, 1)
    if (searchInput.value === item.text) {
      searchInput.value = searchHistory.value.length > 0 ? searchHistory.value[0] : ''
    }
  }
}

// 清空所有历史记录
function clearAllHistory() {
  searchHistory.value = []
  isHistoryListExpanded.value = false
}

// 点击页面其他地方时收起历史记录列表
function handleClickOutside() {
  isHistoryListExpanded.value = false
}

// 保存搜索历史到缓存
function saveSearchHistory() {
  if (searchInput.value && !searchHistory.value.includes(searchInput.value)) {
    searchHistory.value.unshift(searchInput.value)
    searchHistory.value = searchHistory.value.slice(0, 30)
  }
}

// 执行搜索
function handleSearch() {
  if (!searchInput.value.trim())
    return
  saveSearchHistory()
  currentHistoryIndex.value = -1
  emit('search', searchInput.value.trim())
}

// 处理键盘事件
function handleKeydown(event: KeyboardEvent) {
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
    handleSearch()
  }
  else if (event.key === 'Escape') {
    isHistoryListExpanded.value = false
  }
}

// 监听搜索历史变化，自动更新输入框
watch(searchHistory, (newHistory) => {
  if (newHistory.length > 0 && !searchInput.value) {
    searchInput.value = newHistory[0]
  }
}, { immediate: true })

// 初始化显示最新历史记录
showLatestHistory()

// 暴露方法给父组件
defineExpose({
  handleClickOutside,
})
</script>

<template>
  <div class="relative" @click.stop>
    <div class="flex gap-2">
      <BaseInput
        v-model="searchInput"
        placeholder="搜索导航内容..."
        class="flex-1 shadow-sm"
        @keydown="handleKeydown"
        @focus="handleInputFocus"
      />
      <button
        class="px-4 py-2 bg-gray-900 hover:bg-black text-white rounded-lg shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center min-w-[3rem]"
        title="搜索"
        @click="handleSearch"
      >
        <svg class="w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </div>

    <!-- 提示文本 -->
    <div class="mt-1.5 px-1 flex justify-between items-center text-xs text-gray-400">
      <span>使用上下键浏览历史</span>
      <span v-if="searchHistory.length" class="cursor-pointer hover:text-gray-600 transition-colors" @click="toggleHistoryList">
        {{ isHistoryListExpanded ? '收起历史' : '展开历史' }}
      </span>
    </div>

    <!-- 历史记录列表 - 浮动面板 -->
    <div
      v-if="showHistoryList && getFormattedHistoryList().length > 0 && isHistoryListExpanded"
      class="mt-2 bg-white border border-gray-100 rounded-lg shadow-sm overflow-hidden animate-fade-in"
    >
      <div class="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200">
        <div
          v-for="(item, index) in getFormattedHistoryList()"
          :key="index"
          class="group px-3 py-2.5 hover:bg-gray-100 cursor-pointer flex items-center justify-between transition-colors duration-150 border-b border-gray-50 last:border-0"
          :class="{ 'bg-gray-100': index === currentHistoryIndex }"
          @click="selectHistoryItem(item)"
        >
          <div class="flex items-center gap-2 flex-1 min-w-0">
            <svg class="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div class="text-sm text-gray-700 truncate group-hover:text-gray-900">
              {{ item.text }}
            </div>
          </div>
          <button
            class="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200"
            title="删除"
            @click="deleteHistoryItem(item, $event)"
          >
            <svg class="w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- 清空按钮 -->
        <div
          class="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-center text-gray-500 hover:text-red-600 hover:bg-red-50 cursor-pointer transition-colors"
          @click="clearAllHistory"
        >
          清空搜索历史
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 组件样式 */
</style>
