import { createGlobalState, useIntervalFn, useLocalStorage } from '@vueuse/core';
import { computed, ref, shallowRef, watch } from 'vue';
import type { Game } from '@/types/types';
import { pickVarietyGames } from '@/services/executables';
import { getLauncher } from '@/services/game-launcher';
import { VarietyRunner, type RunPhase } from '@/services/variety-runner';
import { useGlobalState } from './app-state';

export const BADGE_TARGET = 100;

export interface VarietySettings {
    count: number;
    minutesPerGame: number;
    breakSeconds: number;
    skipPlayed: boolean;
}

export interface PlayedEntry {
    id: string;
    name: string;
    at: number;
    icon?: string | null;
}

export type QueueStatus = 'pending' | 'playing' | 'played' | 'skipped';

const DEFAULT_SETTINGS: VarietySettings = {
    count: BADGE_TARGET,
    minutesPerGame: 1,
    breakSeconds: 5,
    skipPlayed: true,
};

export const useVarietyRun = createGlobalState(() => {
    const { addLog, varietyActive } = useGlobalState();
    const launcher = getLauncher();

    const settings = useLocalStorage<VarietySettings>('variety.settings', { ...DEFAULT_SETTINGS }, { mergeDefaults: true });
    const played = useLocalStorage<PlayedEntry[]>('variety.played', []);
    const playedIds = computed(() => new Set(played.value.map(p => p.id)));

    const queue = shallowRef<Game[]>([]);
    const statuses = ref<Record<string, QueueStatus>>({});
    const nextIndex = ref(0);
    const phase = ref<RunPhase>('idle');
    const currentIndex = ref(-1);
    const phaseEndsAt = ref(0);
    const now = ref(Date.now());

    let controller: AbortController | null = null;
    let runner: VarietyRunner | null = null;

    const isRunning = computed(() => ['launching', 'playing', 'cooldown'].includes(phase.value));
    const currentGame = computed(() => queue.value[currentIndex.value] ?? null);
    const secondsLeft = computed(() => Math.max(0, Math.ceil((phaseEndsAt.value - now.value) / 1000)));
    const doneInQueue = computed(() => Object.values(statuses.value).filter(s => s === 'played').length);
    /** Picked games still to play, current one first (cut-short games count as still to play). */
    const upcoming = computed(() => queue.value.slice(nextIndex.value).filter(g => statuses.value[g.id] !== 'played' && statuses.value[g.id] !== 'skipped'));
    const remainingInQueue = computed(() => queue.value.slice(nextIndex.value).length);
    const estimatedMinutes = computed(() => {
        const n = isRunning.value || queue.value.length ? remainingInQueue.value : settings.value.count;
        const s = settings.value;
        return Math.ceil((n * s.minutesPerGame * 60 + Math.max(0, n - 1) * s.breakSeconds) / 60);
    });

    // Ticks the countdown only while something is counting down.
    const { pause: stopTicking, resume: startTicking } = useIntervalFn(() => (now.value = Date.now()), 500, { immediate: false });
    watch(isRunning, running => (running ? startTicking() : stopTicking()));
    watch(isRunning, running => (varietyActive.value = running), { immediate: true });

    function buildQueue(pool: Game[]) {
        if (isRunning.value) return;
        const s = settings.value;
        const count = clamp(Math.round(s.count), 1, 500);
        queue.value = pickVarietyGames(pool, {
            count,
            exclude: s.skipPlayed ? playedIds.value : new Set(),
            random: Math.random,
        });
        statuses.value = Object.fromEntries(queue.value.map(g => [g.id, 'pending' as QueueStatus]));
        nextIndex.value = 0;
        currentIndex.value = -1;
        phase.value = 'idle';
        addLog('info', `Game Variety: picked ${queue.value.length} games.`);
    }

    function removeFromQueue(id: string) {
        if (isRunning.value) return;
        const index = queue.value.findIndex(g => g.id === id);
        if (index < nextIndex.value) return;
        queue.value = queue.value.filter(g => g.id !== id);
        delete statuses.value[id];
    }

    function clearQueue() {
        if (isRunning.value) return;
        queue.value = [];
        statuses.value = {};
        nextIndex.value = 0;
        currentIndex.value = -1;
        phase.value = 'idle';
    }

    async function start() {
        if (isRunning.value || nextIndex.value >= queue.value.length) return;
        const s = settings.value;
        controller = new AbortController();
        runner = new VarietyRunner(launcher, {
            onPhase(next, info) {
                phase.value = next;
                if (next === 'launching') {
                    // Anything passed over (skipped, failed to start, no safe exe) is marked skipped.
                    queue.value.slice(0, info.index).forEach(g => {
                        const st = statuses.value[g.id];
                        if (st === 'pending' || st === 'playing') statuses.value[g.id] = 'skipped';
                    });
                    nextIndex.value = info.index;
                }
                if (next === 'launching' || next === 'playing') {
                    currentIndex.value = info.index;
                    if (info.game) statuses.value[info.game.id] = 'playing';
                }
                phaseEndsAt.value = info.endsAt ?? 0;
                now.value = Date.now();
            },
            onPlayed(game, index) {
                statuses.value[game.id] = 'played';
                nextIndex.value = index + 1;
                if (!playedIds.value.has(game.id)) {
                    played.value = [...played.value, { id: game.id, name: game.name, at: Date.now(), icon: game.icon_hash ?? null }];
                }
            },
            onLog: (type, message) => addLog(type, `Game Variety: ${message}`),
        });

        addLog('info', `Game Variety: starting ${remainingInQueue.value} games, ${s.minutesPerGame} min each${launcher.simulated ? ' (simulated, nothing is launched)' : ''}.`);
        const resumeAt = await runner.run(queue.value, {
            durationMs: clamp(s.minutesPerGame, 1, 120) * 60_000,
            gapMs: clamp(s.breakSeconds, 0, 600) * 1000,
            startIndex: nextIndex.value,
        }, controller.signal);

        // A game cut short by Stop goes back to pending; Start plays it again from the beginning.
        const resumeGame = queue.value[resumeAt];
        if (resumeGame && statuses.value[resumeGame.id] === 'playing') statuses.value[resumeGame.id] = 'pending';
        queue.value.slice(0, resumeAt).forEach(g => {
            const st = statuses.value[g.id];
            if (st === 'pending' || st === 'playing') statuses.value[g.id] = 'skipped';
        });
        nextIndex.value = resumeAt;
        currentIndex.value = -1;
        controller = null;
        runner = null;
    }

    /** Stops the current game and ends the run; Start resumes with the next game. */
    function stop() {
        controller?.abort();
    }

    function skip() {
        runner?.skip();
    }

    function resetHistory() {
        played.value = [];
    }

    return {
        settings,
        played,
        playedIds,
        queue,
        statuses,
        nextIndex,
        phase,
        currentIndex,
        currentGame,
        secondsLeft,
        isRunning,
        doneInQueue,
        remainingInQueue,
        upcoming,
        estimatedMinutes,
        simulated: launcher.simulated,
        buildQueue,
        removeFromQueue,
        clearQueue,
        start,
        stop,
        skip,
        resetHistory,
    };
});

function clamp(value: number, min: number, max: number) {
    return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min));
}
