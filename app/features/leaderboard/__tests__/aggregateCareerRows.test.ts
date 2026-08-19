import {describe, it, expect} from "vitest";
import type {PlayerLeaderboardRow} from "@/server/domains/player";
import {aggregateCareerRows} from "../aggregateCareerRows";
import {deriveSeasonCohorts} from "../seasonCohorts";

function row(
    overrides: Partial<PlayerLeaderboardRow> & {season_slug: string; season_start_date: string}
): PlayerLeaderboardRow {
    return {
        player_id: "p1",
        username: "alice",
        display_name: null,
        avatar_url: null,
        region_id: "na",
        region_code: "NA",
        season_id: `season-${overrides.season_slug}-${overrides.region_id ?? "na"}`,
        season_name: "Season",
        team_id: null,
        team_name: null,
        team_slug: null,
        team_logo_url: null,
        team_logo_bg_removed: null,
        sets_played: 0,
        matches_played: 0,
        ape_kills_total: 0,
        ape_attempts_total: 0,
        delay_kills_total: 0,
        quick_kills_total: 0,
        wipes_tools_total: 0,
        kill_attempts_total: 0,
        spiking_errors_total: 0,
        assists_total: 0,
        setting_errors_total: 0,
        kill_blocks_total: 0,
        block_touches_total: 0,
        serve_receives_total: 0,
        digs_total: 0,
        block_follows_total: 0,
        dives_total: 0,
        aces_total: 0,
        service_errors_total: 0,
        misc_errors_total: 0,
        ...overrides,
    } as unknown as PlayerLeaderboardRow;
}

describe("aggregateCareerRows", () => {

    it("re-derives hit_eff from summed attempts rather than averaging seasons", () => {
        const [career] = aggregateCareerRows([
            row({
                season_slug: "s1",
                season_start_date: "2025-01-01",
                sets_played: 2,
                ape_kills_total: 1,
                kill_attempts_total: 1,
            }),
            row({
                season_slug: "s2",
                season_start_date: "2025-06-01",
                sets_played: 40,
                ape_kills_total: 10,
                kill_attempts_total: 40,
            }),
        ]);

        expect(career.hit_eff).toBeCloseTo(11 / 41, 3);
        expect(career.hit_eff).not.toBeCloseTo((1.0 + 0.25) / 2, 2);
    });

    it("subtracts spiking errors and allows a negative hit_eff", () => {
        const [career] = aggregateCareerRows([
            row({
                season_slug: "s1",
                season_start_date: "2025-01-01",
                sets_played: 10,
                ape_kills_total: 2,
                spiking_errors_total: 6,
                kill_attempts_total: 20,
            }),
        ]);
        expect(career.hit_eff).toBeCloseTo(-0.2, 3);
    });

    it("nulls a ratio whose denominator is zero rather than reporting 0", () => {
        const [career] = aggregateCareerRows([
            row({season_slug: "s1", season_start_date: "2025-01-01", sets_played: 5}),
        ]);
        expect(career.hit_eff).toBeNull();
        expect(career.kb_pct).toBeNull();
        expect(career.set_eff).toBeNull();
    });

    it("sums raw totals and rebuilds composites from them", () => {
        const [career] = aggregateCareerRows([
            row({
                season_slug: "s1",
                season_start_date: "2025-01-01",
                sets_played: 10,
                ape_kills_total: 3,
                delay_kills_total: 1,
                kill_blocks_total: 2,
                aces_total: 4,
                service_errors_total: 1,
            }),
            row({
                season_slug: "s2",
                season_start_date: "2025-06-01",
                sets_played: 10,
                quick_kills_total: 2,
                wipes_tools_total: 1,
                kill_blocks_total: 3,
                aces_total: 1,
                service_errors_total: 5,
            }),
        ]);

        expect(career.sets_played).toBe(20);
        expect(career.kills_total).toBe(7);
        expect(career.points_total).toBe(7 + 5 + 5);
        expect(career.service_score).toBe(5 - 6);
        expect(career.points_per_set).toBeCloseTo(17 / 20, 2);
        expect(career.seasons_played).toBe(2);
    });

    it("sums the split ace totals and derives their per-set rates", () => {
        const [career] = aggregateCareerRows([
            row({
                season_slug: "s1",
                season_start_date: "2025-01-01",
                sets_played: 10,
                jump_serve_aces_total: 4,
                float_aces_total: 2,
            }),
            row({
                season_slug: "s2",
                season_start_date: "2025-06-01",
                sets_played: 10,
                jump_serve_aces_total: 6,
                float_aces_total: 8,
            }),
        ]);

        expect(career.jump_serve_aces_total).toBe(10);
        expect(career.float_aces_total).toBe(10);
        expect(career.jump_serve_aces_per_set).toBeCloseTo(0.5, 2);
        expect(career.float_aces_per_set).toBeCloseTo(0.5, 2);
    });

    it("never merges regions, even for the same player", () => {
        const career = aggregateCareerRows([
            row({season_slug: "s1", season_start_date: "2025-01-01", region_id: "na", region_code: "NA", sets_played: 10, aces_total: 5}),
            row({season_slug: "s1", season_start_date: "2025-01-01", region_id: "as", region_code: "AS", sets_played: 4, aces_total: 1}),
        ]);

        expect(career).toHaveLength(2);
        expect(career.map(c => c.region_code).sort()).toEqual(["AS", "NA"]);
        expect(career.find(c => c.region_code === "NA")!.aces_total).toBe(5);
    });

    it("takes identity and team from the most recent season", () => {
        const [career] = aggregateCareerRows([
            row({season_slug: "s1", season_start_date: "2025-01-01", sets_played: 5, team_name: "Old Team", team_slug: "old"}),
            row({season_slug: "s2", season_start_date: "2025-06-01", sets_played: 5, team_name: "New Team", team_slug: "new"}),
        ]);

        expect(career.team_name).toBe("New Team");
        expect(career.season_slug).toBe("s2");

        expect(career.season_id).toBeNull();
        expect(career.season_name).toBeNull();
    });

    it("aggregates only the seasons it is given", () => {
        const all = [
            row({season_slug: "s1", season_start_date: "2025-01-01", sets_played: 10, aces_total: 10}),
            row({season_slug: "s2", season_start_date: "2025-06-01", sets_played: 10, aces_total: 90}),
        ];

        const [s1Only] = aggregateCareerRows(all.filter(r => r.season_slug === "s1"));
        expect(s1Only.aces_total).toBe(10);
        expect(s1Only.seasons_played).toBe(1);

        const [both] = aggregateCareerRows(all);
        expect(both.aces_total).toBe(100);
    });
});

describe("deriveSeasonCohorts", () => {
    it("groups matching slugs across regions, newest first", () => {
        const cohorts = deriveSeasonCohorts([
            row({season_slug: "s1", season_start_date: "2025-01-01", region_id: "na"}),
            row({season_slug: "s1", season_start_date: "2025-01-05", region_id: "as"}),
            row({season_slug: "s2", season_start_date: "2025-06-01", region_id: "na"}),
        ]);

        expect(cohorts.map(c => c.slug)).toEqual(["s2", "s1"]);
        expect(cohorts.map(c => c.label)).toEqual(["Season 2", "Season 1"]);
        expect(cohorts.find(c => c.slug === "s1")!.regionCount).toBe(2);
    });

    it("orders by start date, not slug text", () => {
        const cohorts = deriveSeasonCohorts([
            row({season_slug: "s9", season_start_date: "2025-01-01"}),
            row({season_slug: "s10", season_start_date: "2025-06-01"}),
        ]);
        expect(cohorts.map(c => c.slug)).toEqual(["s10", "s9"]);
        expect(cohorts[0].label).toBe("Season 10");
    });

    it("falls back to the raw slug when it carries no number", () => {
        const cohorts = deriveSeasonCohorts([
            row({season_slug: "preseason", season_start_date: "2025-01-01"}),
        ]);
        expect(cohorts[0].label).toBe("PRESEASON");
    });
});
