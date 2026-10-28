import { createGlobalState } from '@vueuse/core'
import { computed, ComputedRef, ShallowRef, shallowRef } from 'vue'

export const Pages = {
    LIBRARY: 'library',
    VARIETY: 'variety',
    GUIDE: 'guide',
    ACTIVITY: 'activity',
} as const
export type Pages = typeof Pages[keyof typeof Pages]
export interface AppLogObject {
    type: 'info' | 'error' | 'warning' | 'debug';
    message: string;
    timestamp: Date;
}
export interface UseGlobalStateReturn {
    page: ShallowRef<Pages>,
    setPage: (newPage: Pages) => void,
    logs: ShallowRef<AppLogObject[]>,
    addLog: {
        (type: 'info' | 'error' | 'warning' | 'debug', newLog: string): void;
        (newLog: string): void;
    };
    clearLogs: () => void,
    /** Games started by hand from the Library that are still running. */
    manualRunning: ShallowRef<number>,
    /** True while the Game Variety run owns the launcher. */
    varietyActive: ShallowRef<boolean>,
    anyGameRunning: ComputedRef<boolean>,
}

const MAX_LOGS = 500

export const useGlobalState = createGlobalState(
  () => {
    const page = shallowRef<Pages>(Pages.LIBRARY)
    const logs = shallowRef<AppLogObject[]>([])
    const manualRunning = shallowRef(0)
    const varietyActive = shallowRef(false)
    const anyGameRunning = computed(() => manualRunning.value > 0 || varietyActive.value)

    function setPage(newPage: Pages) {
      page.value = newPage
    }

    function addLog(type: string | 'info' | 'error' | 'warning' | 'debug' , newLog?: string) {
      if (!newLog) {
        newLog = type;
        type = 'info';
      }
      const entry = { type: type as AppLogObject['type'], message: `${newLog}`, timestamp: new Date() };
      logs.value = [...logs.value.slice(-(MAX_LOGS - 1)), entry];
    }

    function clearLogs() {
      logs.value = []
    }

    return {
        page,
        setPage,
        logs,
        addLog,
        clearLogs,
        manualRunning,
        varietyActive,
        anyGameRunning,
    } as UseGlobalStateReturn
  }
)
