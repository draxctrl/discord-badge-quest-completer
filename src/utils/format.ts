/** "1 h 45 min", "12 min", "45 s" */
export function formatMinutes(totalMinutes: number): string {
    if (totalMinutes < 1) return 'under a minute';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.round(totalMinutes % 60);
    if (hours === 0) return `${minutes} min`;
    return minutes === 0 ? `${hours} h` : `${hours} h ${minutes} min`;
}

/** 83 -> "1:23" */
export function formatClock(totalSeconds: number): string {
    const s = Math.max(0, Math.floor(totalSeconds));
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
