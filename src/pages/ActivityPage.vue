<script setup lang="ts">
import { computed } from 'vue';
import { useGlobalState } from '@/composables/app-state';

const { logs, clearLogs } = useGlobalState();
const lines = computed(() => [...logs.value].reverse().filter(l => l.type !== 'debug'));

function time(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}
</script>

<template>
  <div class="mx-auto max-w-6xl px-6 py-6">
    <section class="panel p-6" aria-labelledby="activity-title">
      <div class="flex items-center justify-between">
        <h2 id="activity-title" class="text-lg font-bold">Activity</h2>
        <button type="button" class="btn btn-small" :disabled="lines.length === 0" @click="clearLogs()">Clear</button>
      </div>
      <p v-if="lines.length === 0" class="mt-3 text-muted">Nothing yet. Games you start and stop show up here.</p>
      <ul v-else class="mt-4 max-h-[60vh] divide-y divide-line-soft overflow-y-auto rounded-xl border border-line-soft">
        <li v-for="(line, i) in lines" :key="i" class="flex gap-4 px-4 py-2 text-sm">
          <span class="w-20 shrink-0 tabular-nums text-faint">{{ time(line.timestamp) }}</span>
          <span :class="{ 'text-bad': line.type === 'error', 'text-flame-hi': line.type === 'warning' }">{{ line.message }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>
