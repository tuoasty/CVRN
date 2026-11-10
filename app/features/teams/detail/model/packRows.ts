export function packRows(widths: number[], containerWidth: number, gap: number): number[][] {
    const remaining = widths.map((_, i) => i);
    const rows: number[][] = [];

    while (remaining.length > 0) {
        const first = remaining.shift()!;
        const row = [first];
        let space = containerWidth - Math.min(widths[first], containerWidth);

        for (let i = 0; i < remaining.length; ) {
            const needed = widths[remaining[i]] + gap;
            if (needed <= space) {
                row.push(remaining[i]);
                space -= needed;
                remaining.splice(i, 1);
            } else {
                i += 1;
            }
        }
        rows.push(row);
    }

    return rows;
}
