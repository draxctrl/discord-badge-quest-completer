import { describe, expect, it } from 'vitest';
import type { Game } from '@/types/types';
import { describeExecutable, isEligibleForVariety, pickLaunchExecutable, pickVarietyGames } from './executables';

function game(id: string, executables: Game['executables'], name = `Game ${id}`): Game {
    return { id, name, executables };
}

const win = (name: string, is_launcher = false) => ({ name, os: 'win32', is_launcher });

describe('describeExecutable', () => {
    it('splits folder and file name', () => {
        expect(describeExecutable(win('gtfo/gtfo.exe'))).toMatchObject({
            path: 'gtfo',
            filename: 'gtfo.exe',
            segments: 2,
        });
    });

    it('handles a bare file name', () => {
        expect(describeExecutable(win('hurtworld.exe'))).toMatchObject({
            path: '',
            filename: 'hurtworld.exe',
            segments: 1,
        });
    });

    it('handles backslashes', () => {
        expect(describeExecutable(win('win64\\game.exe'))).toMatchObject({ path: 'win64', filename: 'game.exe' });
    });
});

describe('pickLaunchExecutable', () => {
    it('takes the first Windows exe that is not a launcher', () => {
        const g = game('1', [win('launcher.exe', true), { name: 'game.app', os: 'darwin', is_launcher: false }, win('real/game.exe')]);
        expect(pickLaunchExecutable(g)?.name).toBe('real/game.exe');
    });

    it('returns null when there is no usable Windows exe', () => {
        expect(pickLaunchExecutable(game('1', [{ name: 'game.app', os: 'darwin', is_launcher: false }]))).toBeNull();
        expect(pickLaunchExecutable(game('2', [win('a<b>.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('3', [win('folder/')]))).toBeNull();
    });

    it('rejects names that could leave the games folder or are Windows devices', () => {
        expect(pickLaunchExecutable(game('1', [win('../evil.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('2', [win('a/../../evil.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('3', [win('/abs/evil.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('4', [win('con.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('5', [win('folder/NUL.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('6', [win('trailing./x.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('7', [win('ok/fine.exe')]))?.name).toBe('ok/fine.exe');
    });

    it('never picks names that clash with common real programs', () => {
        expect(pickLaunchExecutable(game('1', [win('Discord.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('2', [win('explorer.exe')]))).toBeNull();
        expect(pickLaunchExecutable(game('3', [win('steam/steam.exe')]))).toBeNull();
    });
});

describe('isEligibleForVariety', () => {
    it('needs a launchable exe and an id', () => {
        expect(isEligibleForVariety(game('1', [win('ok.exe')]))).toBe(true);
        expect(isEligibleForVariety(game('', [win('ok.exe')]))).toBe(false);
        expect(isEligibleForVariety(game('1', []))).toBe(false);
    });
});

describe('pickVarietyGames', () => {
    const pool = Array.from({ length: 50 }, (_, i) => game(String(i + 1), [win(`g${i + 1}.exe`)]));

    it('returns the requested number of distinct games', () => {
        const picked = pickVarietyGames(pool, { count: 20, exclude: new Set(), random: () => 0.5 });
        expect(picked).toHaveLength(20);
        expect(new Set(picked.map(g => g.id)).size).toBe(20);
    });

    it('skips excluded (already played) games', () => {
        const exclude = new Set(['1', '2', '3']);
        const picked = pickVarietyGames(pool, { count: 50, exclude, random: Math.random });
        expect(picked).toHaveLength(47);
        expect(picked.some(g => exclude.has(g.id))).toBe(false);
    });

    it('skips ineligible games and duplicate ids', () => {
        const messy = [game('1', [win('a.exe')]), game('1', [win('a.exe')]), game('2', [win('Discord.exe')]), game('3', [win('c.exe')])];
        const picked = pickVarietyGames(messy, { count: 10, exclude: new Set(), random: Math.random });
        expect(picked.map(g => g.id).sort()).toEqual(['1', '3']);
    });

    it('does not mutate the pool', () => {
        const copy = pool.map(g => g.id);
        pickVarietyGames(pool, { count: 10, exclude: new Set(), random: Math.random });
        expect(pool.map(g => g.id)).toEqual(copy);
    });
});
