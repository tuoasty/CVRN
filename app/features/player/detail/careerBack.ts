export function isPlainLeftClick(event: {button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean}): boolean {
    return event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export function isPlayerBehind(entryUrls: readonly string[], currentIndex: number, playerHref: string): boolean {
    const previous = entryUrls[currentIndex - 1];
    if (!previous) return false;
    return new URL(previous).pathname.toLowerCase() === playerHref.toLowerCase();
}
