<script setup lang="ts">
defineProps<{ modelValue: boolean; label: string; hint?: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

<template>
  <label class="flex cursor-pointer items-start gap-3">
    <input
      type="checkbox"
      class="peer sr-only"
      :checked="modelValue"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).checked)"
    />
    <span
      class="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border border-line bg-ink transition-colors peer-checked:border-flame peer-checked:bg-flame peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-flame-hi [&>svg]:opacity-0 peer-checked:[&>svg]:opacity-100"
      aria-hidden="true"
    >
      <svg viewBox="0 0 16 16" class="h-3.5 w-3.5 fill-none stroke-[#1a0c04] transition-opacity" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 8.5l3 3 6-7" /></svg>
    </span>
    <span>
      <span class="font-semibold">{{ label }}</span>
      <span v-if="hint" class="block text-sm text-muted">{{ hint }}</span>
    </span>
  </label>
</template>
