<script setup lang="ts">
import { useId } from 'vue';

withDefaults(defineProps<{
  /** variety = game controller, time = sword (the same pictures Discord uses for these badges) */
  kind: 'variety' | 'time';
  color: string;
  locked?: boolean;
  size?: number;
}>(), { locked: false, size: 56 });

const gid = useId();
</script>

<template>
  <svg
    viewBox="0 0 100 100"
    :width="size"
    :height="size"
    role="img"
    aria-hidden="true"
    :style="locked ? { filter: 'grayscale(0.85) brightness(0.5)' } : undefined"
  >
    <defs>
      <linearGradient :id="`${gid}-body`" x1="0.15" y1="0" x2="0.85" y2="1">
        <stop offset="0" :style="{ stopColor: `color-mix(in srgb, ${color} 55%, white)` }" />
        <stop offset="0.5" :stop-color="color" />
        <stop offset="1" :style="{ stopColor: `color-mix(in srgb, ${color} 60%, black)` }" />
      </linearGradient>
      <linearGradient :id="`${gid}-dark`" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" :style="{ stopColor: `color-mix(in srgb, ${color} 45%, black)` }" />
        <stop offset="1" :style="{ stopColor: `color-mix(in srgb, ${color} 25%, black)` }" />
      </linearGradient>
    </defs>

    <!-- Game Variety: controller (about 1.6 : 1, like the one on Discord) -->
    <g v-if="kind === 'variety'">
      <path
        d="M31 25H69C81 25 88 33 90 44L92 64C93 73 87 79 80 78C74.5 77 72 72 70 68C68.5 65.5 66 64 63 64H37C34 64 31.5 65.5 30 68C28 72 25.5 77 20 78C13 79 7 73 8 64L10 44C12 33 19 25 31 25Z"
        :fill="`url(#${gid}-body)`"
      />
      <path d="M34 27.5H66" :stroke="`color-mix(in srgb, ${color} 35%, white)`" stroke-opacity="0.85" stroke-width="2" stroke-linecap="round" fill="none" />
      <!-- d-pad -->
      <path d="M29 38.5v15M21.5 46h15" :stroke="`url(#${gid}-dark)`" stroke-width="5" stroke-linecap="round" fill="none" />
      <!-- four buttons -->
      <circle cx="71" cy="39.5" r="3.3" :fill="`url(#${gid}-dark)`" />
      <circle cx="77.5" cy="46" r="3.3" :fill="`url(#${gid}-dark)`" />
      <circle cx="71" cy="52.5" r="3.3" :fill="`url(#${gid}-dark)`" />
      <circle cx="64.5" cy="46" r="3.3" :fill="`url(#${gid}-dark)`" />
      <!-- small middle buttons -->
      <circle cx="45" cy="47" r="2" :fill="`url(#${gid}-dark)`" />
      <circle cx="50" cy="47" r="2" :fill="`url(#${gid}-dark)`" />
      <circle cx="55" cy="47" r="2" :fill="`url(#${gid}-dark)`" />
    </g>

    <!-- Game Time: sword -->
    <g v-else transform="rotate(45 50 50)">
      <path d="M50 4l8 12v47H42V16z" :fill="`url(#${gid}-body)`" />
      <path d="M50 8v54" :stroke="`color-mix(in srgb, ${color} 35%, white)`" stroke-opacity="0.6" stroke-width="2.4" stroke-linecap="round" fill="none" />
      <rect x="30" y="62" width="40" height="8" rx="3" :fill="`url(#${gid}-dark)`" />
      <rect x="45.5" y="70" width="9" height="15" rx="3" :fill="`url(#${gid}-dark)`" />
      <circle cx="50" cy="90" r="5.5" :fill="`url(#${gid}-body)`" />
    </g>
  </svg>
</template>
