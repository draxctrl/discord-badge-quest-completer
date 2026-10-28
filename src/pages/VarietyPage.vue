<script setup lang="ts">
import { computed, watch } from 'vue';
import { useGlobalState } from '@/composables/app-state';
import { useFetchGameList } from '@/composables/fetch-gamelist';
import { useVarietyRun, type QueueStatus } from '@/composables/variety-run';
import { pickLaunchExecutable } from '@/services/executables';
import { formatClock, formatMinutes } from '@/utils/format';
import PunchCard from '@/components/PunchCard.vue';
import GameIcon from '@/components/GameIcon.vue';
import BadgeLadder from '@/components/BadgeLadder.vue';
import SyncNotice from '@/components/SyncNotice.vue';
import { VARIETY_BADGE } from '@/constants/badges';
import { useBadgeBaseline } from '@/composables/badge-baseline';
import NumberField from '@/components/NumberField.vue';
import CheckField from '@/components/CheckField.vue';

const run = useVarietyRun();
const { gameDB, allFetchDone } = useFetchGameList();
const { manualRunning } = useGlobalState();

const settings = run.settings;
const baseline = useBadgeBaseline();
const gamesTotal = computed(() => baseline.value.games + run.played.value.length);
const hasQueue = computed(() => run.queue.value.length > 0);
const canResume = computed(() => run.nextIndex.value > 0 && run.nextIndex.value < run.queue.value.length);
const blockedByManual = computed(() => manualRunning.value > 0);
const listLoading = computed(() => gameDB.value.length === 0);

const startLabel = computed(() => (canResume.value ? 'Resume' : 'Start'));

const phaseLabel = computed(() => {
  switch (run.phase.value) {
    case 'launching': return 'Starting';
    case 'playing': return 'Playing';
    case 'cooldown': return 'Short break';
    case 'halted': return 'Stopped: a game would not close';
    case 'done': return 'Finished';
    case 'stopped': return 'Stopped';
    default: return 'Ready';
  }
});

const progress = computed(() => {
  if (run.phase.value !== 'playing') return 0;
  const total = settings.value.minutesPerGame * 60;
  return Math.min(1, Math.max(0, 1 - run.secondsLeft.value / total));
});

const statusText: Record<QueueStatus, string> = {
  pending: 'Waiting',
  playing: 'Playing',
  played: 'Played',
  skipped: 'Skipped',
};

function exeName(index: number) {
  const exe = pickLaunchExecutable(run.queue.value[index]);
  return exe ? exe.name.split(/[\\/]/).pop() : '';
}

// Pick the games as soon as the list is ready, and re-pick if the settings change
// before anything has been played, so the card always shows the whole run.
watch(
  [() => gameDB.value.length, () => settings.value.count, () => settings.value.skipPlayed],
  () => {
    if (gameDB.value.length === 0 || run.isRunning.value || run.nextIndex.value > 0) return;
    run.buildQueue(gameDB.value);
  },
  { immediate: true },
);

function begin() {
  if (!hasQueue.value || run.nextIndex.value >= run.queue.value.length) run.buildQueue(gameDB.value);
  run.start();
}
</script>

<template>
  <div class="mx-auto grid max-w-6xl gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_380px]">
    <div class="flex min-w-0 flex-col gap-6">
      <PunchCard :played="run.played.value" :active="run.phase.value === 'playing' || run.phase.value === 'launching'" :upcoming="run.upcoming.value" />

      <section class="panel p-6" aria-labelledby="levels-title">
        <h2 id="levels-title" class="text-lg font-bold">Game Variety levels</h2>
        <p class="mb-4 mt-1 text-sm text-muted">Each new game you play moves you up. Level 10, Universalist, is 100 games.</p>
        <BadgeLadder :badge="VARIETY_BADGE" :value="gamesTotal" :medal="62" />
        <SyncNotice class="mt-5" text="Discord doesn’t update your badge straight away. The games you play and the hours can take up to 24 to 48 hours to show on your Discord profile." />
        <div class="mt-5 grid items-end gap-3 border-t border-line-soft pt-5 sm:grid-cols-[minmax(0,16rem)_1fr]">
          <NumberField v-model="baseline.games" label="Starting point (optional)" unit="games" :min="0" :max="500" />
          <p class="text-sm text-muted">Optional, you can leave this at 0. The app can’t read your level from Discord, so if you want the levels above to match your profile, type the number of games your Discord profile already counts. This app’s games are added on top.</p>
        </div>
      </section>

      <section class="panel flex min-h-0 flex-col p-6" aria-labelledby="queue-title">
        <div class="flex items-center justify-between gap-3">
          <h2 id="queue-title" class="text-lg font-bold">This run</h2>
          <div v-if="hasQueue" class="flex items-center gap-2 text-sm text-muted">
            <span class="tabular-nums">{{ run.doneInQueue.value }} of {{ run.queue.value.length }} played</span>
            <button type="button" class="btn btn-small" :disabled="run.isRunning.value" @click="run.buildQueue(gameDB)">Pick new games</button>
            <button type="button" class="btn btn-small" :disabled="run.isRunning.value" @click="run.clearQueue()">Clear</button>
          </div>
        </div>

        <p v-if="!hasQueue" class="mt-4 max-w-prose text-muted">
          No games picked yet. They appear here as soon as the game list has loaded.
        </p>

        <ol v-else class="mt-4 max-h-[22rem] divide-y divide-line-soft overflow-y-auto rounded-xl border border-line-soft" aria-label="Games in this run">
          <li
            v-for="(game, i) in run.queue.value"
            :key="game.id"
            class="flex items-center gap-3 px-4 py-2.5"
            :class="run.statuses.value[game.id] === 'playing' ? 'bg-raised' : ''"
          >
            <span class="w-8 shrink-0 text-right text-xs tabular-nums text-faint">{{ i + 1 }}</span>
            <span class="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line-soft"><GameIcon :id="game.id" :hash="game.icon_hash" :name="game.name" /></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ game.name }}</span>
              <span class="block truncate font-mono text-xs text-faint">{{ exeName(i) }}</span>
            </span>
            <span
              class="shrink-0 text-sm font-semibold"
              :class="{
                'text-flame-hi': run.statuses.value[game.id] === 'playing',
                'text-ok': run.statuses.value[game.id] === 'played',
                'text-faint': run.statuses.value[game.id] === 'pending',
                'text-muted': run.statuses.value[game.id] === 'skipped',
              }"
            >{{ statusText[run.statuses.value[game.id] ?? 'pending'] }}</span>
            <button
              v-if="!run.isRunning.value && i >= run.nextIndex.value"
              type="button"
              class="shrink-0 text-faint hover:text-bad"
              :aria-label="`Remove ${game.name}`"
              @click="run.removeFromQueue(game.id)"
            >Remove</button>
          </li>
        </ol>
      </section>
    </div>

    <aside class="flex flex-col gap-6">
      <section class="panel p-6" aria-labelledby="now-title">
        <h2 id="now-title" class="text-lg font-bold">{{ run.isRunning.value ? phaseLabel : 'Run settings' }}</h2>

        <div v-if="run.isRunning.value" class="mt-3">
          <p class="truncate font-display text-2xl font-bold">{{ run.currentGame.value?.name ?? 'Next game' }}</p>
          <p class="mt-1 text-sm text-muted">
            <template v-if="run.phase.value === 'cooldown'">Next game starts in {{ formatClock(run.secondsLeft.value) }}</template>
            <template v-else-if="run.phase.value === 'playing'">{{ formatClock(run.secondsLeft.value) }} left</template>
            <template v-else>Opening the game</template>
          </p>
          <div class="mt-3 h-2 overflow-hidden rounded-full bg-ink" role="progressbar" :aria-valuenow="Math.round(progress * 100)" aria-valuemin="0" aria-valuemax="100">
            <div class="h-full rounded-full bg-flame transition-[width] duration-500" :style="{ width: `${progress * 100}%` }"></div>
          </div>
          <div class="mt-5 grid grid-cols-2 gap-3">
            <button type="button" class="btn" :disabled="run.phase.value !== 'playing'" @click="run.skip()">Skip game</button>
            <button type="button" class="btn btn-stop" @click="run.stop()">Stop</button>
          </div>
        </div>

        <div v-else class="mt-4 flex flex-col gap-4">
          <NumberField v-model="settings.count" label="Games to play" :min="1" :max="500" :step="5" />
          <NumberField v-model="settings.minutesPerGame" label="Minutes per game" :min="1" :max="120" />
          <NumberField v-model="settings.breakSeconds" label="Break between games" unit="sec" :min="0" :max="600" :step="5" />
          <CheckField v-model="settings.skipPlayed" label="Skip games I already played" :hint="`${run.played.value.length} played so far`" />

          <p class="rounded-lg bg-ink px-3 py-2.5 text-sm text-muted">
            About <strong class="text-cream">{{ formatMinutes(run.estimatedMinutes.value) }}</strong> in total. One game runs at a time and each one is closed before the next starts.
          </p>

          <p v-if="blockedByManual" class="text-sm text-flame-hi">A game from the Library is running. Stop it first.</p>
          <p v-else-if="listLoading" class="text-sm text-muted">Loading the game list{{ allFetchDone ? '. It came back empty.' : '…' }}</p>

          <button type="button" class="btn btn-primary" :disabled="blockedByManual || listLoading" @click="begin()">{{ startLabel }}</button>
          <button v-if="run.played.value.length" type="button" class="btn btn-small self-start" @click="run.resetHistory()">Reset games played</button>
        </div>
      </section>

      <p class="px-1 text-sm text-faint">
        This count only covers games started from this app. Discord decides what counts toward the badge, so check your Discord profile to see it.
      </p>
      <p v-if="run.simulated" class="rounded-lg border border-line px-3 py-2 text-sm text-flame-hi">
        Preview mode: nothing is launched and Discord never sees these games.
      </p>
    </aside>
  </div>
</template>
