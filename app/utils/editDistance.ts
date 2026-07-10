// Levenshtein distance, case-insensitive. Used to rank roster candidates against
// a mistyped username in the stats sheet. Rosters cap at ~36 names, so the
// O(n*m) fill is irrelevant here.
export function editDistance(a: string, b: string): number {
    const s = a.toLowerCase();
    const t = b.toLowerCase();
    if (s === t) return 0;
    if (s.length === 0) return t.length;
    if (t.length === 0) return s.length;

    let prev = Array.from({length: t.length + 1}, (_, i) => i);
    let curr = new Array<number>(t.length + 1);

    for (let i = 1; i <= s.length; i++) {
        curr[0] = i;
        for (let j = 1; j <= t.length; j++) {
            const cost = s[i - 1] === t[j - 1] ? 0 : 1;
            curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
        }
        [prev, curr] = [curr, prev];
    }

    return prev[t.length];
}
