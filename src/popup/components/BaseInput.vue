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

interface Emits {
  'update:modelValue': [value: string]
  'keydown': [event: KeyboardEvent]
  'focus': [event: FocusEvent]
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  disabled: false,
  error: false,
  type: 'text',
  autocomplete: 'off',
})

const emit = defineEmits<Emits>()

const inputClasses = computed(() => [
  'w-full px-4 py-3 border rounded-lg text-sm transition-all duration-200',
  'focus:outline-none focus:ring-2 focus:border-transparent',
  'disabled:cursor-not-allowed disabled:opacity-50',
  props.error
    ? 'border-red-300 focus:ring-red-500'
    : 'border-gray-200 focus:ring-blue-300',
].join(' '))

const styleValue = computed(() => ({
  backgroundColor: 'rgb(250, 249, 245)',
  color: 'rgb(20, 20, 19)',
  borderRadius: '7.5px',
}))

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
    :style="styleValue"
    @input="handleInput"
    @keydown="handleKeydown"
    @focus="handleFocus"
  >
</template>
