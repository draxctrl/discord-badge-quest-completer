<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue';
import { useElementSize, useIntervalFn } from '@vueuse/core';
import { openLink } from '@/services/open-link';
import { GAMEZA_URL } from '@/constants/links';

// The ad is never copied into the app: it is the live page at BANNER_URL, so
// whatever is published there is what shows here.
const BANNER_URL = 'https://gameza.lk/stream/banner.html';
const REFRESH_MS = 15 * 60 * 1000;

// The banner page is 900x260 with a 20px see-through margin around the
// 860x220 card. We crop to the card and scale it to whatever width we get.
const CARD_W = 860;
const CARD_H = 220;
const PAGE_W = 900;
const PAGE_H = 260;
const MARGIN = 20;

const box = useTemplateRef<HTMLElement>('box');
const { width } = useElementSize(box);
const scale = computed(() => (width.value > 0 ? width.value / CARD_W : 0));

// A fresh query value on every load and every 15 minutes, so a cached copy of
// the page is never reused and an updated ad appears without restarting the app.
const loadedAt = ref(Date.now());
useIntervalFn(() => (loadedAt.value = Date.now()), REFRESH_MS);
const src = computed(() => `${BANNER_URL}?v=${loadedAt.value}`);

function openSite() {
  openLink(GAMEZA_URL);
}
</script>

<template>
  <div ref="box" class="banner group relative w-full overflow-hidden rounded-xl bg-raised" :style="{ aspectRatio: `${CARD_W} / ${CARD_H}` }">
    <!-- Shown only until the banner paints over it (or if the PC is offline). -->
    <div class="absolute inset-0 grid place-items-center font-display text-lg font-semibold text-faint">Gameza</div>
    <iframe
      v-if="scale > 0"
      :key="loadedAt"
      :src="src"
      title="Gameza"
      sandbox="allow-scripts allow-same-origin"
      referrerpolicy="no-referrer"
      tabindex="-1"
      scrolling="no"
      class="pointer-events-none absolute border-0 bg-transparent"
      :style="{
        width: `${PAGE_W}px`,
        height: `${PAGE_H}px`,
        left: `${-MARGIN * scale}px`,
        top: `${-MARGIN * scale}px`,
        transform: `scale(${scale})`,
        transformOrigin: '0 0',
      }"
    ></iframe>
    <!-- Clicking anywhere on the ad opens the website in the normal browser. -->
    <button
      type="button"
      class="absolute inset-0 z-10 cursor-pointer rounded-xl ring-inset transition-shadow hover:ring-2 hover:ring-flame-hi/70"
      aria-label="Open gameza.lk in your browser"
      title="Open gameza.lk"
      @click="openSite"
    ></button>
  </div>
</template>
