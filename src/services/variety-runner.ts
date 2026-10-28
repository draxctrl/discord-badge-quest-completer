import type { Game, GameExecutable } from '@/types/types';
import { pickLaunchExecutable } from './executables';

export interface RunningGame {
    pid: number;
    filename: string;
}

export interface GameLauncher {
    readonly simulated: boolean;
    start(game: Game, executable: GameExecutable): Promise<RunningGame>;
    stop(running: RunningGame): Promise<void>;
}

export type RunPhase = 'idle' | 'launching' | 'playing' | 'cooldown' | 'done' | 'stopped' | 'halted';

export interface RunHooks {
    onPhase(phase: RunPhase, info: { index: number; game?: Game; endsAt?: number }): void;
    onPlayed(game: Game, index: number): void;
    onLog(type: 'info' | 'error' | 'warning', message: string): void;
}

export interface RunOptions {
    durationMs: number;
    gapMs: number;
    startIndex: number;
}

/** Resolves after `ms`, or as soon as `signal` aborts. Never rejects. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise(resolve => {
        if (signal?.aborted) return resolve();
        const timer = setTimeout(done, ms);
        signal?.addEventListener('abort', done, { once: true });
        function done() {
            clearTimeout(timer);
            signal?.removeEventListener('abort', done);
            resolve();
        }
    });
}

/**
 * Plays a queue of games one at a time: start, wait, stop, short break, next.
 * Only one fake game is ever running. If a game cannot be stopped the run
 * halts rather than starting another on top of it.
 */
export class VarietyRunner {
    private skipController: AbortController | null = null;

    constructor(
        private launcher: GameLauncher,
        private hooks: RunHooks,
        private wait: (ms: number, signal?: AbortSignal) => Promise<void> = sleep,
        private now: () => number = Date.now,
    ) {}

    /** Ends the current game early and moves on to the next one. */
    skip() {
        this.skipController?.abort();
    }

    /** Returns the index to resume from next time. */
    async run(queue: Game[], options: RunOptions, signal: AbortSignal): Promise<number> {
        let index = options.startIndex;

        for (; index < queue.length; index++) {
            if (signal.aborted) break;
            const game = queue[index];
            const executable = pickLaunchExecutable(game);
            if (!executable) {
                this.hooks.onLog('warning', `Skipped ${game.name}: no safe Windows exe to launch.`);
                continue;
            }

            this.hooks.onPhase('launching', { index, game });
            let running: RunningGame;
            try {
                running = await this.launcher.start(game, executable);
            } catch (error) {
                this.hooks.onLog('error', `Could not start ${game.name}: ${errorText(error)}`);
                continue;
            }

            this.skipController = new AbortController();
            const stepSignal = AbortSignal.any([signal, this.skipController.signal]);
            const startedAt = this.now();
            this.hooks.onPhase('playing', { index, game, endsAt: startedAt + options.durationMs });
            this.hooks.onLog('info', `Playing ${game.name} (${executable.name}).`);
            await this.wait(options.durationMs, stepSignal);
            const playedFully = !stepSignal.aborted;
            this.skipController = null;

            try {
                await this.launcher.stop(running);
                this.hooks.onLog('info', `Stopped ${game.name}.`);
            } catch (error) {
                this.hooks.onLog('error', `Could not stop ${game.name}: ${errorText(error)}. Run halted so two games never run at once.`);
                this.hooks.onPhase('halted', { index, game });
                return index;
            }

            if (playedFully) this.hooks.onPlayed(game, index);
            if (signal.aborted) break;

            if (index < queue.length - 1 && options.gapMs > 0) {
                this.hooks.onPhase('cooldown', { index, endsAt: this.now() + options.gapMs });
                await this.wait(options.gapMs, signal);
            }
        }

        if (signal.aborted) {
            this.hooks.onPhase('stopped', { index });
            return index;
        }
        this.hooks.onPhase('done', { index: queue.length });
        return queue.length;
    }
}

function errorText(error: unknown) {
    return error instanceof Error ? error.message : String(error);
}
