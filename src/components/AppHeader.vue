<script setup lang="ts">
import { Pages, useGlobalState } from '@/composables/app-state';
import { useVarietyRun } from '@/composables/variety-run';
import BannerFrame from './BannerFrame.vue';

const { page, setPage, anyGameRunning } = useGlobalState();
const variety = useVarietyRun();

const tabs = [
  { id: Pages.LIBRARY, label: 'Library' },
  { id: Pages.VARIETY, label: 'Game Variety' },
  { id: Pages.GUIDE, label: 'Guide' },
  { id: Pages.ACTIVITY, label: 'Activity' },
];
</script>

<template>
  <header class="border-b border-line-soft bg-panel">
    <div class="mx-auto flex max-w-6xl items-center gap-6 px-6 py-4">
      <div class="flex min-w-0 flex-1 flex-col gap-4">
        <div class="flex items-center gap-3">
          <img src="/logo.svg" alt="" class="h-9 w-9" />
          <div class="min-w-0 leading-tight">
            <h1 class="font-display text-lg font-bold leading-tight">Discord Badge and Quest Completer</h1>
            <p class="mt-0.5 truncate text-xs text-muted">
              <template v-if="variety.isRunning.value">Game Variety is running</template>
              <template v-else-if="anyGameRunning">A game is running</template>
              <template v-else>No game running</template>
            </p>
          </div>
        </div>
        <nav aria-label="Pages" class="flex gap-1">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            type="button"
            class="rounded-lg px-3.5 py-1.5 text-sm font-semibold transition-colors"
            :class="page === tab.id ? 'bg-raised text-flame-hi' : 'text-muted hover:text-cream'"
            :aria-current="page === tab.id ? 'page' : undefined"
            @click="setPage(tab.id)"
          >
            {{ tab.label }}
          </button>
        </nav>
      </div>
      <div class="w-[min(54%,600px)] shrink-0">
        <BannerFrame />
      </div>
    </div>
  </header>
</template>
