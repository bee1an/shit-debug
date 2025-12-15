<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  modelValue: string
  placeholder?: string
  disabled?: boolean
  error?: boolean
  type?: 'text' | 'password' | 'email' | 'url'
  autocomplete?: string
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  disabled: false,
  error: false,
  type: 'text',
  autocomplete: 'off',
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'keydown': [event: KeyboardEvent]
  'focus': [event: FocusEvent]
}>()

const inputClasses = computed(() => [
  'w-full px-4 py-2.5 border rounded-lg text-sm transition-all duration-200 outline-none block',
  'bg-gray-50 text-gray-800 placeholder-gray-400',
  'focus:bg-white focus:ring-2 focus:ring-gray-200 focus:border-gray-400',
  'disabled:cursor-not-allowed disabled:opacity-60 disabled:bg-gray-100',
  props.error
    ? 'border-red-300 focus:ring-red-100 focus:border-red-400 text-red-600'
    : 'border-gray-200 hover:border-gray-300',
].join(' '))

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function handleKeydown(event: KeyboardEvent) {
  emit('keydown', event)
}

function handleFocus(event: FocusEvent) {
  emit('focus', event)
}
</script>

<template>
  <input
    :value="modelValue"
    :type="type"
    :placeholder="placeholder"
    :disabled="disabled"
    :autocomplete="autocomplete"
    :class="inputClasses"
    @input="handleInput"
    @keydown="handleKeydown"
    @focus="handleFocus"
  >
</template>
