import { describe, expect, it } from 'vitest';
import { TIME_BADGE, tierProgress, VARIETY_BADGE } from './badges';

describe('badge data', () => {
    it('has ten ascending levels each, ending at 100 games and 5000 hours', () => {
        for (const badge of [VARIETY_BADGE, TIME_BADGE]) {
            expect(badge.tiers).toHaveLength(10);
            const at = badge.tiers.map(t => t.at);
            expect([...at].sort((a, b) => a - b)).toEqual(at);
        }
        expect(VARIETY_BADGE.tiers.at(-1)?.at).toBe(100);
        expect(TIME_BADGE.tiers.at(-1)?.at).toBe(5000);
    });
});

describe('tierProgress', () => {
    const tiers = VARIETY_BADGE.tiers;

    it('is before the first level at zero', () => {
        const p = tierProgress(tiers, 0);
        expect(p.current).toBeNull();
        expect(p.next?.name).toBe('Sampler');
        expect(p.remaining).toBe(2);
        expect(p.fraction).toBe(0);
        expect(p.reachedCount).toBe(0);
    });

    it('lands on a level exactly at its threshold', () => {
        const p = tierProgress(tiers, 10);
        expect(p.current?.name).toBe('Enthusiast');
        expect(p.next?.name).toBe('Ranger');
        expect(p.remaining).toBe(5);
        expect(p.fraction).toBe(0);
    });

    it('measures progress between two levels', () => {
        const p = tierProgress(tiers, 12); // 10 -> 15
        expect(p.current?.name).toBe('Enthusiast');
        expect(p.remaining).toBe(3);
        expect(p.fraction).toBeCloseTo(0.4);
    });

    it('is complete at and past the top level', () => {
        for (const v of [100, 250]) {
            const p = tierProgress(tiers, v);
            expect(p.current?.name).toBe('Universalist');
            expect(p.next).toBeNull();
            expect(p.remaining).toBe(0);
            expect(p.fraction).toBe(1);
            expect(p.reachedCount).toBe(10);
        }
    });
});
