export function officialsUnchanged(currentUsernames: string[], sheetUsernames: string[]): boolean {
    const current = new Set(currentUsernames.map(u => u.toLowerCase()))
    const sheet = new Set(sheetUsernames.map(u => u.toLowerCase()))
    return current.size === sheet.size && [...current].every(u => sheet.has(u))
}
