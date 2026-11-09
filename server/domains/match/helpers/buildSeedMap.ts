type SeedRow = {
    seed_home: number | null;
    seed_away: number | null;
    home_team_id: string | null;
    away_team_id: string | null;
};

export function buildSeedMap(rows: SeedRow[]): Record<string, number> {
    const seeds: Record<string, number> = {};
    const assign = (teamId: string | null, seed: number | null) => {
        if (!teamId || seed == null || teamId in seeds) return;
        seeds[teamId] = seed;
    };
    for (const row of rows) {
        assign(row.home_team_id, row.seed_home);
        assign(row.away_team_id, row.seed_away);
    }
    return seeds;
}
