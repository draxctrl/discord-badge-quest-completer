import type { Game, GameExecutable } from '@/types/types';

const ILLEGAL_PATH_CHARS = ['>', '<', ':', '"', '|', '?', '*'];

// File names of real programs people have open. A fake game with one of these
// names could be mistaken for (or confused with) the real thing, so the
// automatic runs never use them.
const RESERVED_FILENAMES = new Set([
    'discord.exe', 'discordptb.exe', 'discordcanary.exe', 'update.exe',
    'explorer.exe', 'svchost.exe', 'csrss.exe', 'winlogon.exe', 'lsass.exe', 'services.exe',
    'taskmgr.exe', 'cmd.exe', 'powershell.exe', 'conhost.exe', 'dwm.exe', 'rundll32.exe',
    'chrome.exe', 'msedge.exe', 'firefox.exe', 'opera.exe', 'brave.exe',
    'steam.exe', 'steamwebhelper.exe', 'epicgameslauncher.exe', 'battle.net.exe',
    'obs64.exe', 'obs32.exe', 'spotify.exe', 'code.exe', 'notepad.exe',
    'discord-quest-completer.exe', 'src-win.exe',
]);

// Windows treats these as devices, not files: "con.exe" cannot be created normally.
const WINDOWS_DEVICE_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

/** Every part of the name must be a plain file or folder name, never `..`, empty, or a device. */
function hasSafeSegments(name: string) {
    const sections = name.split(/\\|\//);
    return sections.every(section =>
        section !== '' &&
        section !== '.' &&
        section !== '..' &&
        !/[. ]$/.test(section) &&
        !WINDOWS_DEVICE_NAMES.test(section),
    );
}

export interface DescribedExecutable extends GameExecutable {
    path: string;
    filename: string;
    segments: number;
}

export function isValidPath(name: string) {
    return !ILLEGAL_PATH_CHARS.some(char => name.includes(char));
}

/** For the manual Library: same checks as the automatic run, minus the exe-only and reserved-name rules. */
export function isSafeToCreate(name: string) {
    return isValidPath(name) && hasSafeSegments(name);
}

export function describeExecutable(executable: GameExecutable): DescribedExecutable {
    const sections = executable.name.split(/\\|\//);
    const filename = sections[sections.length - 1] ?? '';
    return {
        ...executable,
        path: sections.slice(0, -1).join('/'),
        filename,
        segments: sections.length,
    };
}

/** The exe the automatic run starts for a game: the first Windows one that is safe to fake. */
export function pickLaunchExecutable(game: Game): GameExecutable | null {
    for (const executable of game.executables ?? []) {
        if (executable.os !== 'win32' || executable.is_launcher) continue;
        if (!isValidPath(executable.name) || !hasSafeSegments(executable.name)) continue;
        const { filename } = describeExecutable(executable);
        if (!filename.toLowerCase().endsWith('.exe')) continue;
        if (RESERVED_FILENAMES.has(filename.toLowerCase())) continue;
        return executable;
    }
    return null;
}

export function isEligibleForVariety(game: Game) {
    return Boolean(game.id) && pickLaunchExecutable(game) !== null;
}

/** Random, distinct, eligible games, leaving out ids in `exclude`. */
export function pickVarietyGames(
    pool: Game[],
    { count, exclude, random }: { count: number; exclude: Set<string>; random: () => number },
): Game[] {
    const seen = new Set<string>();
    const candidates: Game[] = [];
    for (const game of pool) {
        if (seen.has(game.id) || exclude.has(game.id) || !isEligibleForVariety(game)) continue;
        seen.add(game.id);
        candidates.push(game);
    }
    // Fisher-Yates, only as far as we need.
    const take = Math.min(count, candidates.length);
    for (let i = 0; i < take; i++) {
        const j = i + Math.floor(random() * (candidates.length - i));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    return candidates.slice(0, take);
}
