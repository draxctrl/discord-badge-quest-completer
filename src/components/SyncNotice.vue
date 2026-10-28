<script setup lang="ts">
defineProps<{ text: string }>();
</script>

<template>
  <p class="flex items-start gap-3 rounded-xl border border-line bg-ink px-4 py-3 text-sm leading-relaxed text-muted" role="note">
    <svg viewBox="0 0 20 20" class="mt-0.5 h-5 w-5 shrink-0 fill-none stroke-flame-hi" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" />
      <path d="M10 5.8V10l2.8 1.8" />
    </svg>
    <span>{{ text }}</span>
  </p>
</template>
