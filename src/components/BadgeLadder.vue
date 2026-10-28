<script setup lang="ts">
import { computed } from 'vue';
import { tierProgress, type BadgeInfo } from '@/constants/badges';
import BadgeMedal from './BadgeMedal.vue';

const props = defineProps<{
  badge: BadgeInfo;
  /**
   * How much the person has so far (games, or hours). Leave it out for a plain
   * explanation: every level then shows in full color and there is no progress bar.
   */
  value?: number;
  /** Medal size in px. */
  medal?: number;
}>();

const progress = computed(() => (props.value === undefined ? null : tierProgress(props.badge.tiers, props.value)));

function isLocked(at: number) {
  return props.value !== undefined && props.value < at;
}

function amount(n: number) {
  const unit = n === 1 ? props.badge.unitOne : props.badge.unit;
  return `${n.toLocaleString()}${n === props.badge.tiers[props.badge.tiers.length - 1].at ? '+' : ''} ${unit}`;
}

function shown(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
</script>

<template>
  <div>
    <div v-if="progress" class="mb-4">
      <div class="flex items-baseline justify-between gap-3">
        <p class="font-semibold">
          <template v-if="progress.next">{{ shown(progress.remaining) }} more {{ progress.remaining === 1 ? badge.unitOne : badge.unit }} to {{ progress.next.name }}</template>
          <template v-else>Top level reached</template>
        </p>
        <p class="text-sm text-muted">{{ progress.current ? `Level: ${progress.current.name}` : 'No level yet' }}</p>
      </div>
      <div class="mt-2 h-2 overflow-hidden rounded-full bg-ink" role="progressbar" :aria-valuenow="Math.round(progress.fraction * 100)" aria-valuemin="0" aria-valuemax="100">
        <div class="h-full rounded-full bg-flame transition-[width] duration-500" :style="{ width: `${progress.fraction * 100}%` }"></div>
      </div>
    </div>

    <ul class="grid grid-cols-5 gap-x-2 gap-y-4">
      <li v-for="tier in badge.tiers" :key="tier.name" class="flex flex-col items-center text-center" :title="`${tier.name}: ${amount(tier.at)}`">
        <BadgeMedal :kind="badge.id" :color="tier.color" :locked="isLocked(tier.at)" :size="medal ?? 56" />
        <span class="mt-1.5 text-[13px] font-semibold leading-tight" :class="isLocked(tier.at) ? 'text-faint' : 'text-cream'">{{ tier.name }}</span>
        <span class="flex items-center gap-1 text-xs text-muted">
          <svg v-if="isLocked(tier.at)" viewBox="0 0 16 16" class="h-3 w-3 fill-none stroke-current" stroke-width="1.6" stroke-linecap="round" aria-label="Locked"><rect x="3.5" y="7" width="9" height="6.5" rx="1.5" /><path d="M5.5 7V5.5a2.5 2.5 0 0 1 5 0V7" /></svg>
          {{ amount(tier.at) }}
        </span>
      </li>
    </ul>
  </div>
</template>
