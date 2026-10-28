import { invoke } from '@tauri-apps/api/core';
import type { Game, GameExecutable } from '@/types/types';
import { describeExecutable } from './executables';
import type { GameLauncher, RunningGame } from './variety-runner';

export function isTauri() {
    return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/** Creates the dummy exe for a game and starts it; stops it by process id. */
class TauriLauncher implements GameLauncher {
    readonly simulated = false;

    async start(game: Game, executable: GameExecutable): Promise<RunningGame> {
        const { path, filename, segments } = describeExecutable(executable);
        const appId = Number(game.id);
        await invoke('create_fake_game', {
            path,
            executable_name: filename,
            path_len: segments,
            app_id: appId,
            display_name: game.name,
        });
        const pid = await invoke<string>('run_background_process', {
            name: game.name,
            path,
            executable_name: filename,
            path_len: segments,
            app_id: appId,
            icon_hash: game.icon_hash ?? null,
        });
        return { pid: Number(pid), filename };
    }

    async stop(running: RunningGame) {
        await invoke('stop_process_pid', { pid: running.pid, exec_name: running.filename });
    }
}

/** Browser preview: nothing is created or started, Discord never sees anything. */
class SimulatedLauncher implements GameLauncher {
    readonly simulated = true;
    private nextPid = 1000;

    async start(_game: Game, executable: GameExecutable): Promise<RunningGame> {
        await new Promise(resolve => setTimeout(resolve, 150));
        return { pid: this.nextPid++, filename: describeExecutable(executable).filename };
    }

    async stop() {
        await new Promise(resolve => setTimeout(resolve, 80));
    }
}

let launcher: GameLauncher | null = null;

export function getLauncher(): GameLauncher {
    launcher ??= isTauri() ? new TauriLauncher() : new SimulatedLauncher();
    return launcher;
}
