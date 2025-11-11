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

// 处理输入框获得焦点时全选内容
function handleInputFocus(event: FocusEvent) {
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
  <div class="p-4 bg-white rounded-xl border border-gray-100 shadow-sm relative">
    <div class="flex gap-2">
      <BaseInput
        v-model="searchInput"
        placeholder="输入要搜索的导航内容"
        class="flex-1"
        @keydown="handleKeydown"
        @focus="handleInputFocus"
      />
      <button
        class="px-4 py-3 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg transition-all duration-200 flex items-center justify-center"
        style="color: rgb(20, 20, 19); border-radius: 7.5px;"
        @click="handleSearch"
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
