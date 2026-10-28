import { describe, expect, it, vi } from 'vitest';
import type { Game } from '@/types/types';
import { sleep, VarietyRunner, type GameLauncher, type RunHooks, type RunPhase } from './variety-runner';

const win = (name: string) => ({ name, os: 'win32', is_launcher: false });
const games: Game[] = [1, 2, 3].map(i => ({ id: String(i), name: `G${i}`, executables: [win(`g${i}.exe`)] }));

function fakeLauncher(overrides: Partial<GameLauncher> = {}) {
    const events: string[] = [];
    let running = 0;
    let maxConcurrent = 0;
    let pid = 100;
    const launcher: GameLauncher = {
        simulated: true,
        async start(game) {
            running++;
            maxConcurrent = Math.max(maxConcurrent, running);
            events.push(`start ${game.name}`);
            return { pid: pid++, filename: `${game.name}.exe` };
        },
        async stop(r) {
            running--;
            events.push(`stop ${r.filename}`);
        },
        ...overrides,
    };
    return { launcher, events, maxConcurrent: () => maxConcurrent };
}

function hooks() {
    const phases: RunPhase[] = [];
    const played: string[] = [];
    const logs: string[] = [];
    const h: RunHooks = {
        onPhase: phase => phases.push(phase),
        onPlayed: game => played.push(game.id),
        onLog: (type, message) => logs.push(`${type}: ${message}`),
    };
    return { h, phases, played, logs };
}

const instant = () => Promise.resolve();
const opts = { durationMs: 60_000, gapMs: 5_000, startIndex: 0 };

describe('VarietyRunner', () => {
    it('plays each game in turn, one at a time', async () => {
        const f = fakeLauncher();
        const k = hooks();
        const next = await new VarietyRunner(f.launcher, k.h, instant).run(games, opts, new AbortController().signal);

        expect(f.events).toEqual(['start G1', 'stop G1.exe', 'start G2', 'stop G2.exe', 'start G3', 'stop G3.exe']);
        expect(f.maxConcurrent()).toBe(1);
        expect(k.played).toEqual(['1', '2', '3']);
        expect(k.phases.at(-1)).toBe('done');
        expect(next).toBe(3);
    });

    it('waits the play time, then the break, between games', async () => {
        const waits: number[] = [];
        const wait = (ms: number) => { waits.push(ms); return Promise.resolve(); };
        await new VarietyRunner(fakeLauncher().launcher, hooks().h, wait).run(games, opts, new AbortController().signal);
        expect(waits).toEqual([60_000, 5_000, 60_000, 5_000, 60_000]);
    });

    it('stops the running game and ends when stopped mid-game', async () => {
        const f = fakeLauncher();
        const k = hooks();
        const ctrl = new AbortController();
        const wait = (_ms: number, signal?: AbortSignal) => { ctrl.abort(); return sleep(10_000, signal); };

        const next = await new VarietyRunner(f.launcher, k.h, wait).run(games, opts, ctrl.signal);

        expect(f.events).toEqual(['start G1', 'stop G1.exe']);
        expect(k.played).toEqual([]);
        expect(k.phases.at(-1)).toBe('stopped');
        expect(next).toBe(0);
    });

    it('skip ends the current game early without counting it', async () => {
        const f = fakeLauncher();
        const k = hooks();
        let runner!: VarietyRunner;
        let first = true;
        const wait = (_ms: number, signal?: AbortSignal) => {
            if (first) { first = false; runner.skip(); }
            return sleep(0, signal);
        };
        runner = new VarietyRunner(f.launcher, k.h, wait);
        await runner.run(games, opts, new AbortController().signal);

        expect(f.events).toEqual(['start G1', 'stop G1.exe', 'start G2', 'stop G2.exe', 'start G3', 'stop G3.exe']);
        expect(k.played).toEqual(['2', '3']);
    });

    it('halts instead of starting another game when a stop fails', async () => {
        const f = fakeLauncher({ stop: vi.fn().mockRejectedValue(new Error('access denied')) });
        const k = hooks();
        const next = await new VarietyRunner(f.launcher, k.h, instant).run(games, opts, new AbortController().signal);

        expect(f.events).toEqual(['start G1']);
        expect(k.phases.at(-1)).toBe('halted');
        expect(k.logs.some(l => l.includes('Run halted'))).toBe(true);
        expect(next).toBe(0);
    });

    it('moves on when a game fails to start', async () => {
        let calls = 0;
        const f = fakeLauncher();
        const start = f.launcher.start.bind(f.launcher);
        f.launcher.start = async (g, e) => { if (calls++ === 0) throw new Error('nope'); return start(g, e); };
        const k = hooks();
        await new VarietyRunner(f.launcher, k.h, instant).run(games, opts, new AbortController().signal);

        expect(k.played).toEqual(['2', '3']);
        expect(k.logs[0]).toContain('Could not start G1');
    });

    it('resumes from the given index', async () => {
        const f = fakeLauncher();
        await new VarietyRunner(f.launcher, hooks().h, instant).run(games, { ...opts, startIndex: 2 }, new AbortController().signal);
        expect(f.events).toEqual(['start G3', 'stop G3.exe']);
    });
});
