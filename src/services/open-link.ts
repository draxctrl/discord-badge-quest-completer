import { openUrl } from '@tauri-apps/plugin-opener';
import { isTauri } from './game-launcher';

/** Opens a web link in the normal browser (inside the app window it would replace the app). */
export async function openLink(url: string) {
    if (isTauri()) {
        await openUrl(url);
    } else {
        window.open(url, '_blank', 'noopener');
    }
}
