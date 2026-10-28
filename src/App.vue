<script setup lang="ts">
import AppHeader from './components/AppHeader.vue';
import { usePlaytime } from './composables/playtime';
import { Pages, useGlobalState } from './composables/app-state';
import { openLink } from './services/open-link';
import { ORIGINAL_URL, SOURCE_URL } from './constants/links';
import ActivityPage from './pages/ActivityPage.vue';
import GuidePage from './pages/GuidePage.vue';
import LibraryPage from './pages/LibraryPage.vue';
import VarietyPage from './pages/VarietyPage.vue';

const { page } = useGlobalState();
usePlaytime(); // starts counting game time as soon as the app opens
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-ink">
    <AppHeader />
    <main class="flex-1 overflow-y-auto">
      <div class="flex min-h-full flex-col">
        <!-- v-show keeps each page's state while you switch tabs. -->
        <LibraryPage v-show="page === Pages.LIBRARY" />
        <VarietyPage v-show="page === Pages.VARIETY" />
        <GuidePage v-show="page === Pages.GUIDE" />
        <ActivityPage v-show="page === Pages.ACTIVITY" />

        <!-- Credit: the last thing at the bottom of every page, not pinned to the window. -->
        <footer class="mt-auto px-6 pb-6 pt-2 text-center text-xs text-faint">
          Based on Discord Quest Completer by Mark Terence Tiglao, shared under the MIT license.
          <button type="button" class="ml-1 font-semibold text-muted underline-offset-2 hover:text-flame-hi hover:underline" @click="openLink(ORIGINAL_URL)">View the original</button>
          <button type="button" class="ml-3 font-semibold text-muted underline-offset-2 hover:text-flame-hi hover:underline" @click="openLink(SOURCE_URL)">Source code</button>
        </footer>
      </div>
    </main>
  </div>
</template>
