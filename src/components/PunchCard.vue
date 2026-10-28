<script setup lang="ts">
import { computed } from 'vue';
import { BADGE_TARGET, type PlayedEntry } from '@/composables/variety-run';
import type { Game } from '@/types/types';
import GameIcon from './GameIcon.vue';

const props = defineProps<{
  played: PlayedEntry[];
  /** Games picked for this run and not played yet, in order. The first one is the next (or current) game. */
  upcoming: Game[];
  /** True while a game is on, so the next cell pulses. */
  active: boolean;
}>();

const cells = computed(() =>
  Array.from({ length: BADGE_TARGET }, (_, i) => {
    const entry = props.played[i] ?? null;
    const queued = entry ? null : (props.upcoming[i - props.played.length] ?? null);
    return {
      index: i,
      entry,
      queued,
      current: props.active && !entry && i === props.played.length && queued !== null,
      title: entry?.name ?? queued?.name ?? `Game ${i + 1}`,
    };
  }),
);

const count = computed(() => Math.min(props.played.length, BADGE_TARGET));
const reached = computed(() => props.played.length >= BADGE_TARGET);
const queuedCount = computed(() => cells.value.filter(c => c.queued).length);
</script>

<template>
  <section class="panel p-6" aria-labelledby="punch-title">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h2 id="punch-title" class="text-base font-semibold text-muted">Games played with this app</h2>
        <p class="mt-1 flex items-baseline gap-2 font-display">
          <span class="text-6xl font-extrabold leading-none tabular-nums text-cream">{{ count }}</span>
          <span class="text-2xl font-semibold text-faint">of {{ BADGE_TARGET }}</span>
        </p>
      </div>
      <div class="text-right">
        <p v-if="reached" class="rounded-lg bg-raised px-3 py-1.5 text-sm font-semibold text-ok">Target reached</p>
        <p v-else-if="queuedCount" class="text-sm text-muted">{{ queuedCount }} more picked, shown dimmed</p>
      </div>
    </div>

    <ol class="mt-5 grid grid-cols-10 gap-1.5" :aria-label="`${count} of ${BADGE_TARGET} games played`">
      <li
        v-for="cell in cells"
        :key="cell.index"
        :title="cell.title"
        class="punch-cell"
        :class="{
          'is-filled': !!cell.entry,
          'has-icon': !!cell.entry?.icon,
          'is-queued': !!cell.queued,
          'is-current': cell.current,
        }"
      >
        <GameIcon v-if="cell.entry?.icon" :id="cell.entry.id" :hash="cell.entry.icon" :name="cell.entry.name" class="punch-img" />
        <GameIcon v-else-if="cell.queued" :id="cell.queued.id" :hash="cell.queued.icon_hash" :name="cell.queued.name" class="punch-img punch-img-dim" />
        <span class="sr-only">{{ cell.entry ? `Played: ${cell.title}` : cell.current ? `Playing now: ${cell.title}` : cell.queued ? `Picked: ${cell.title}` : 'Not played yet' }}</span>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.punch-cell {
  aspect-ratio: 1;
  border-radius: 7px;
  border: 1px solid var(--color-line);
  background: var(--color-ink);
  position: relative;
  overflow: hidden;
  transition: background-color 300ms, border-color 300ms;
}

/* A played cell is "punched": flame ticket with a hole through it (when there is no icon). */
.punch-cell.is-filled {
  background: linear-gradient(150deg, var(--color-flame-hi), var(--color-flame) 55%, var(--color-flame-deep));
  border-color: var(--color-flame);
}
.punch-cell.is-filled::after {
  content: '';
  position: absolute;
  inset: 31%;
  border-radius: 50%;
  background: var(--color-panel);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
}

/* With a game icon the cell shows the icon instead of the punched hole. */
.punch-cell.has-icon { background: var(--color-raised); }
.punch-cell.has-icon::after { display: none; }
.punch-img { border-radius: 6px; }

/* Picked but not played yet: the icon is there, but dimmed. */
.punch-cell.is-queued { border-style: dashed; background: var(--color-raised); }
.punch-img-dim { opacity: 0.4; filter: saturate(0.7); }

.punch-cell.is-current {
  border-style: solid;
  border-color: var(--color-flame-hi);
  animation: pulse 1.6s ease-in-out infinite;
}
.punch-cell.is-current .punch-img-dim { opacity: 0.85; filter: none; }
@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255, 154, 77, 0); }
  50% { box-shadow: 0 0 0 3px rgba(255, 154, 77, 0.35); }
}
</style>
