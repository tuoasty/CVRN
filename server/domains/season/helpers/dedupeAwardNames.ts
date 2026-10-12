export function dedupeAwardNames(rows: readonly {award_name: string}[]): string[] {
    const seen = new Set<string>();
    const names: string[] = [];
    for (const row of rows) {
        const name = row.award_name.trim();
        if (!name) continue;
        const key = name.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        names.push(name);
    }
    return names;
}
