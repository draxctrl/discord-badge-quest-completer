<script setup lang="ts">
import { computed, ref, watch } from 'vue';

const props = withDefaults(defineProps<{
  id: string;
  hash?: string | null;
  name: string;
  /** Image size to request from Discord (it serves powers of two). */
  request?: number;
}>(), { request: 64 });

const failed = ref(false);
watch(() => [props.id, props.hash], () => (failed.value = false));

const src = computed(() =>
  props.hash ? `https://cdn.discordapp.com/app-icons/${props.id}/${props.hash}.png?size=${props.request}` : null,
);
const initial = computed(() => (props.name.trim()[0] ?? '?').toUpperCase());
</script>

<template>
  <img
    v-if="src && !failed"
    :src="src"
    :alt="name"
    decoding="async"
    referrerpolicy="no-referrer"
    class="block h-full w-full object-cover"
    @error="failed = true"
  />
  <span v-else class="grid h-full w-full place-items-center bg-raised font-display font-bold text-muted" aria-hidden="true">{{ initial }}</span>
</template>
