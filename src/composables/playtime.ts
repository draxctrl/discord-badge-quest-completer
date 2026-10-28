import { createGlobalState, useIntervalFn, useLocalStorage } from '@vueuse/core';
import { computed } from 'vue';
import { useGlobalState } from './app-state';

const TICK_SECONDS = 5;

/** How long this app has kept a game running, saved between sessions. */
export const usePlaytime = createGlobalState(() => {
    const { anyGameRunning } = useGlobalState();
    const seconds = useLocalStorage('playtime.seconds', 0);

    useIntervalFn(() => {
        if (anyGameRunning.value) seconds.value += TICK_SECONDS;
    }, TICK_SECONDS * 1000);

    const hours = computed(() => seconds.value / 3600);

    function reset() {
        seconds.value = 0;
    }

    return { seconds, hours, reset };
});
