<script setup lang="ts">
import { computed, ref, shallowRef } from 'vue';
import { onClickOutside, refDebounced } from '@vueuse/core';
import { useFuse } from '@vueuse/integrations/useFuse';
import type { UseFuseOptions } from '@vueuse/integrations';
import Fuse from 'fuse.js';
import { useGlobalState } from '@/composables/app-state';
import { useFetchGameList } from '@/composables/fetch-gamelist';
import { getCurrentOS } from '@/constants/constants';
import { describeExecutable, isSafeToCreate } from '@/services/executables';
import { getLauncher } from '@/services/game-launcher';
import type { RunningGame } from '@/services/variety-runner';
import type { Game, GameExecutable } from '@/types/types';
import { randomString } from '@/utils/random-string';
import GameIcon from '@/components/GameIcon.vue';
import BadgeLadder from '@/components/BadgeLadder.vue';
import SyncNotice from '@/components/SyncNotice.vue';
import { TIME_BADGE } from '@/constants/badges';
import { usePlaytime } from '@/composables/playtime';
import { useBadgeBaseline } from '@/composables/badge-baseline';
import NumberField from '@/components/NumberField.vue';

const { gameDB, fetchGameList, isLoadingGH, isLoadingDiscord, isLoadingBundled } = useFetchGameList();
const { addLog, manualRunning, varietyActive } = useGlobalState();
const launcher = getLauncher();
const playtime = usePlaytime();
const baseline = useBadgeBaseline();
const hoursTotal = computed(() => baseline.value.hours + playtime.hours.value);

const loading = computed(() => isLoadingGH.value || isLoadingDiscord.value || isLoadingBundled.value);

// --- search ---------------------------------------------------------------
const searchQuery = shallowRef('');
const debouncedQuery = refDebounced(searchQuery, 250);
const searchOpen = ref(false);
const searchBox = ref<HTMLElement | null>(null);
onClickOutside(searchBox, () => (searchOpen.value = false));

const ignoredSymbols = /[©™®]/g;
const fuseOptions = computed<UseFuseOptions<Game>>(() => ({
  fuseOptions: {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'aliases', weight: 0.2 },
      { name: 'executables.name', weight: 0.1 },
    ],
    getFn: (obj: any, path: string[] | string) => {
      const value = Fuse.config.getFn(obj, path);
      return typeof value === 'string' ? value.replace(ignoredSymbols, '') : value;
    },
    isCaseSensitive: false,
    threshold: 0.4,
    includeScore: true,
  },
  resultLimit: 10,
  matchAllWhenSearchEmpty: false,
}));
const { results: searchResults } = useFuse(debouncedQuery, gameDB, fuseOptions);

// --- your games ------------------------------------------------------------
const gameList = ref<Game[]>([]);
const selectedUid = ref<string | null>(null);
const selectedGame = computed(() => gameList.value.find(g => g.uid === selectedUid.value) ?? null);
const running = ref(new Map<string, RunningGame>());

function addGame(game: Game) {
  const existing = gameList.value.find(g => g.id === game.id);
  if (existing) {
    selectedUid.value = existing.uid ?? null;
  } else {
    const entry = { ...game, uid: randomString() };
    gameList.value.push(entry);
    selectedUid.value = entry.uid!;
  }
  searchOpen.value = false;
  searchQuery.value = '';
}

function removeGame(game: Game) {
  if (isGameRunning(game)) return;
  gameList.value = gameList.value.filter(g => g.uid !== game.uid);
  if (selectedUid.value === game.uid) selectedUid.value = null;
}

// --- executables -----------------------------------------------------------
const currentOS = getCurrentOS();

const executables = computed<GameExecutable[]>(() => {
  const game = selectedGame.value;
  if (!game) return [];
  const safe = game.executables.filter(e => isSafeToCreate(e.name));
  const forThisOS = safe.filter(e => e.os === currentOS);
  return forThisOS.length > 0 ? forThisOS : safe;
});

const usingFallback = computed(() => executables.value.length > 0 && !executables.value.some(e => e.os === currentOS));

function runKey(game: Game, executable: GameExecutable) {
  return `${game.uid}:${executable.name}`;
}
function isExecutableRunning(game: Game, executable: GameExecutable) {
  return running.value.has(runKey(game, executable));
}
function isGameRunning(game: Game) {
  return game.executables.some(e => running.value.has(runKey(game, e)));
}
function crumbs(executable: GameExecutable) {
  const { path, filename } = describeExecutable(executable);
  return [...(path ? path.split('/') : []), filename];
}

const busy = ref(false);

async function play(game: Game, executable: GameExecutable) {
  if (busy.value || varietyActive.value) return;
  busy.value = true;
  try {
    addLog('info', `Playing ${game.name} (${executable.name}).`);
    const started = await launcher.start(game, executable);
    running.value.set(runKey(game, executable), started);
    manualRunning.value = running.value.size;
  } catch (error) {
    addLog('error', `Could not start ${game.name}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    busy.value = false;
  }
}

async function stop(game: Game, executable: GameExecutable) {
  const key = runKey(game, executable);
  const started = running.value.get(key);
  if (!started) return;
  try {
    await launcher.stop(started);
    addLog('info', `Stopped ${game.name}.`);
    running.value.delete(key);
  } catch (error) {
    addLog('error', `Could not stop ${game.name}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    manualRunning.value = running.value.size;
  }
}
</script>

<template>
  <div class="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-6">
    <div ref="searchBox" class="relative">
      <div class="flex gap-3">
        <input
          v-model="searchQuery"
          type="search"
          class="field"
          placeholder="Search games Discord can detect"
          aria-label="Search games"
          @focus="searchOpen = true"
          @keydown.esc="searchOpen = false"
        />
        <button type="button" class="btn shrink-0" :disabled="loading" @click="fetchGameList()">{{ loading ? 'Updating…' : 'Update game list' }}</button>
      </div>

      <div v-if="searchOpen && debouncedQuery" class="absolute z-20 mt-2 w-full overflow-hidden rounded-xl border border-line bg-panel shadow-2xl shadow-black/50">
        <ul v-if="searchResults.length" class="max-h-80 divide-y divide-line-soft overflow-y-auto">
          <li v-for="result in searchResults" :key="result.item.id" class="flex items-center gap-3 px-4 py-2.5">
            <span class="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line-soft"><GameIcon :id="result.item.id" :hash="result.item.icon_hash" :name="result.item.name" /></span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-medium">{{ result.item.name }}</span>
              <span class="block truncate font-mono text-xs text-faint">{{ result.item.executables.map(e => e.name).slice(0, 2).join(', ') }}</span>
            </span>
            <button type="button" class="btn btn-small" @click="addGame(result.item)">Add</button>
          </li>
        </ul>
        <p v-else class="px-4 py-3 text-muted">No game matches “{{ debouncedQuery }}”.</p>
      </div>
    </div>

    <div class="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section class="panel p-5" aria-labelledby="mine-title">
        <h2 id="mine-title" class="text-lg font-bold">Your games</h2>
        <p v-if="gameList.length === 0" class="mt-3 text-muted">Search above and add a game to start it by hand. For many games in a row, use Game Variety.</p>
        <ul v-else class="mt-3 flex flex-col gap-2">
          <li v-for="game in gameList" :key="game.uid">
            <div
              class="flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors"
              :class="selectedUid === game.uid ? 'border-flame/60 bg-raised' : 'border-line-soft hover:border-line'"
            >
              <span class="h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-line-soft"><GameIcon :id="game.id" :hash="game.icon_hash" :name="game.name" /></span>
              <button type="button" class="min-w-0 flex-1 text-left" @click="selectedUid = game.uid ?? null">
                <span class="block truncate font-semibold">{{ game.name }}</span>
                <span v-if="isGameRunning(game)" class="text-sm text-ok">Running</span>
              </button>
              <button v-if="!isGameRunning(game)" type="button" class="text-sm text-faint hover:text-bad" @click="removeGame(game)">Remove</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="panel p-5" aria-labelledby="launch-title">
        <h2 id="launch-title" class="text-lg font-bold">{{ selectedGame ? selectedGame.name : 'Launch' }}</h2>
        <p v-if="!selectedGame" class="mt-3 text-muted">Pick a game on the left to see what it can launch.</p>

        <template v-else>
          <p v-if="varietyActive" class="mt-3 text-sm text-flame-hi">Game Variety is running. Stop it before starting a game here.</p>
          <p v-if="executables.length === 0" class="mt-3 text-muted">Discord has no launchable program registered for this game on {{ currentOS }}.</p>
          <p v-else-if="usingFallback" class="mt-3 text-sm text-muted">No {{ currentOS }} program is registered, so the name of another platform's program is used.</p>

          <ul class="mt-4 flex flex-col gap-2">
            <li v-for="executable in executables" :key="executable.name" class="flex items-center gap-3 rounded-xl border border-line-soft px-3 py-2.5">
              <span class="shrink-0 rounded-full bg-ink px-2.5 py-0.5 text-xs text-muted">{{ executable.os }}</span>
              <span class="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto whitespace-nowrap font-mono text-xs text-muted">
                <template v-for="(part, i) in crumbs(executable)" :key="i">
                  <span v-if="i > 0" class="text-faint">/</span>
                  <span :class="i === crumbs(executable).length - 1 ? 'text-cream' : ''">{{ part }}</span>
                </template>
              </span>
              <button
                v-if="!isExecutableRunning(selectedGame, executable)"
                type="button"
                class="btn btn-primary btn-small"
                :disabled="busy || varietyActive"
                @click="play(selectedGame, executable)"
              >Play</button>
              <button v-else type="button" class="btn btn-stop btn-small" @click="stop(selectedGame, executable)">Stop</button>
            </li>
          </ul>
          <p v-if="launcher.simulated" class="mt-4 text-sm text-flame-hi">Preview mode: nothing is launched.</p>
        </template>
      </section>
    </div>

    <section class="panel p-6" aria-labelledby="time-title">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="time-title" class="text-lg font-bold">Game Time levels</h2>
        <p class="text-sm text-muted">
          This app has kept games running for <strong class="text-cream">{{ playtime.hours.value.toFixed(1) }} hours</strong>
          <button type="button" class="ml-2 text-faint hover:text-bad" @click="playtime.reset()">Reset</button>
        </p>
      </div>
      <p class="mb-4 mt-1 text-sm text-muted">Leave a game running and the hours add up. Discord keeps the real total on your profile.</p>
      <BadgeLadder :badge="TIME_BADGE" :value="hoursTotal" :medal="62" />
      <SyncNotice class="mt-5" text="Discord doesn’t update your badge straight away. The games you play and the hours can take up to 24 to 48 hours to show on your Discord profile." />
      <div class="mt-5 grid items-end gap-3 border-t border-line-soft pt-5 sm:grid-cols-[minmax(0,16rem)_1fr]">
        <NumberField v-model="baseline.hours" label="Starting point (optional)" unit="hours" :min="0" :max="20000" :step="10" />
        <p class="text-sm text-muted">Optional, you can leave this at 0. The app can’t read your level from Discord, so if you want the levels above to match your profile, type the hours your Discord profile already counts. The time this app keeps games running is added on top.</p>
      </div>
    </section>
  </div>
</template>
