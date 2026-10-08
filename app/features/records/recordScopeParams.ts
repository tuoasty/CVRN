export type RecordSeasonOption = {
    number: number;
    regionCodes: string[];
};

export function buildSeasonOptions(
    seasons: {region_id: string; season_number: number}[],
    regions: {id: string; code: string}[],
): RecordSeasonOption[] {
    const codeById = new Map(regions.map(r => [r.id, r.code.toUpperCase()]));
    const byNumber = new Map<number, Set<string>>();
    for (const season of seasons) {
        const code = codeById.get(season.region_id);
        if (!code) continue;
        const codes = byNumber.get(season.season_number) ?? new Set<string>();
        codes.add(code);
        byNumber.set(season.season_number, codes);
    }
    return [...byNumber.entries()]
        .map(([number, codes]) => ({number, regionCodes: [...codes].sort()}))
        .sort((a, b) => b.number - a.number);
}

export function seasonsForRegion(options: RecordSeasonOption[], region: string | null): RecordSeasonOption[] {
    if (!region) return options;
    const code = region.toUpperCase();
    return options.filter(o => o.regionCodes.includes(code));
}

export function buildRecordsHref(region: string | null, season: number | null): string {
    const query = new URLSearchParams();
    if (region) query.set("region", region.toUpperCase());
    if (season !== null) query.set("season", String(season));
    const qs = query.toString();
    return qs ? `/records?${qs}` : "/records";
}

export function nextScopeForRegion(
    options: RecordSeasonOption[],
    region: string | null,
    season: number | null,
): {region: string | null; season: number | null} {
    if (season === null) return {region, season};
    const available = seasonsForRegion(options, region).some(o => o.number === season);
    return {region, season: available ? season : null};
}
