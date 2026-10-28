import { createGlobalState, useLocalStorage } from '@vueuse/core';

export interface BadgeBaseline {
    /** Games Discord already counts on the profile (typed in by the person). */
    games: number;
    /** Hours Discord already counts on the profile (typed in by the person). */
    hours: number;
}

/**
 * The app cannot read badge progress from Discord, so the person types in what
 * their profile shows. Progress made through this app is added on top.
 */
export const useBadgeBaseline = createGlobalState(() =>
    useLocalStorage<BadgeBaseline>('badge.baseline', { games: 0, hours: 0 }, { mergeDefaults: true }),
);
