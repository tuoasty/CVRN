export function isPlayerBehind(entryUrls: readonly string[], currentIndex: number, playerHref: string): boolean {
    const previous = entryUrls[currentIndex - 1];
    if (!previous) return false;
    return new URL(previous).pathname.toLowerCase() === playerHref.toLowerCase();
}
