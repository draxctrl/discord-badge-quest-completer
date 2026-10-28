export interface BadgeTier {
    name: string;
    /** Games (Game Variety) or hours (Game Time) needed. */
    at: number;
    color: string;
}

export interface BadgeInfo {
    id: 'variety' | 'time';
    title: string;
    unit: string;
    unitOne: string;
    tiers: BadgeTier[];
}

// Level names, thresholds, order and colors follow Discord's two detectable-games badges.
// The icons are drawn for this app in the same style (controller, sword).
export const VARIETY_BADGE: BadgeInfo = {
    id: 'variety',
    title: 'Game Variety',
    unit: 'games',
    unitOne: 'game',
    tiers: [
        { name: 'Sampler', at: 2, color: '#8fa3b5' },
        { name: 'Dabbler', at: 5, color: '#a3c97f' },
        { name: 'Enthusiast', at: 10, color: '#4fd18b' },
        { name: 'Ranger', at: 15, color: '#2fd4c8' },
        { name: 'Explorer', at: 20, color: '#3fb2ff' },
        { name: 'Adventurer', at: 30, color: '#5b78ff' },
        { name: 'Voyager', at: 40, color: '#a07bff' },
        { name: 'Maverick', at: 60, color: '#ff55cf' },
        { name: 'Polymath', at: 80, color: '#e0405f' },
        { name: 'Universalist', at: 100, color: '#e8a23a' },
    ],
};

export const TIME_BADGE: BadgeInfo = {
    id: 'time',
    title: 'Game Time',
    unit: 'hours',
    unitOne: 'hour',
    tiers: [
        { name: 'Casual', at: 1, color: '#8fa3b5' },
        { name: 'Recreational', at: 5, color: '#a3c97f' },
        { name: 'Dedicated', at: 20, color: '#4fd18b' },
        { name: 'Committed', at: 75, color: '#2fd4c8' },
        { name: 'Serious', at: 150, color: '#3fb2ff' },
        { name: 'Devoted', at: 300, color: '#5b78ff' },
        { name: 'Seasoned', at: 500, color: '#a07bff' },
        { name: 'Ironclad', at: 1000, color: '#ff55cf' },
        { name: 'Unshakeable', at: 2000, color: '#e0405f' },
        { name: 'Eternal', at: 5000, color: '#e8a23a' },
    ],
};

export interface TierProgress {
    /** Highest level reached, or null before the first. */
    current: BadgeTier | null;
    /** Next level to reach, or null at the top. */
    next: BadgeTier | null;
    /** How much is left until `next` (0 at the top). */
    remaining: number;
    /** 0..1 progress from the current level to the next. */
    fraction: number;
    reachedCount: number;
}

export function tierProgress(tiers: BadgeTier[], value: number): TierProgress {
    const reached = tiers.filter(t => value >= t.at);
    const current = reached[reached.length - 1] ?? null;
    const next = tiers[reached.length] ?? null;
    if (!next) {
        return { current, next: null, remaining: 0, fraction: 1, reachedCount: reached.length };
    }
    const from = current?.at ?? 0;
    return {
        current,
        next,
        remaining: Math.max(0, next.at - value),
        fraction: Math.min(1, Math.max(0, (value - from) / (next.at - from))),
        reachedCount: reached.length,
    };
}
