import {describe, expect, it} from "vitest";
import {aggregateCareerRows} from "@/app/features/leaderboard/aggregateCareerRows";
import type {PlayerAward, PlayerDetail, PlayerLeaderboardRow, PlayerSeasonStat} from "@/server/domains/player/types";
import {buildRepresentativeCard, fitNameSize} from "../representativeCard";
import {REPRESENTATIVES} from "../representatives";

const EU_PLAYER = REPRESENTATIVES.find(r => r.region === "eu")!.player;
const AS_PLAYER = REPRESENTATIVES.find(r => r.region === "as")!.player;

const ZERO = {
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
    jump_serve_aces_total: 0,
    float_aces_total: 0,
    service_errors_total: 0,
    misc_errors_total: 0,
    sets_played: 0,
    matches_played: 0,
};

const rows = [
    {
        ...ZERO,
        season_id: "s1",
        ape_kills_total: 10,
        delay_kills_total: 5,
        quick_kills_total: 3,
        wipes_tools_total: 2,
        kill_attempts_total: 40,
        spiking_errors_total: 4,
        kill_blocks_total: 6,
        aces_total: 4,
        assists_total: 100,
        setting_errors_total: 4,
        serve_receives_total: 10,
        digs_total: 5,
        block_follows_total: 3,
        dives_total: 2,
        sets_played: 10,
    },
    {
        ...ZERO,
        season_id: "s2",
        ape_kills_total: 10,
        kill_attempts_total: 20,
        spiking_errors_total: 2,
        aces_total: 6,
        assists_total: 96,
        serve_receives_total: 5,
        sets_played: 5.5,
    },
];

const award = (category: string, award_name: string) => ({category, award_name}) as unknown as PlayerAward;

const detail = {
    player: {
        username: "chrathniaggedio",
        display_name: "Nickeyy",
        avatar_url: "https://tr.rbxcdn.com/x",
    } as unknown as PlayerDetail["player"],
    seasonStats: rows as unknown as PlayerSeasonStat[],
    awards: [
        award("champion_roster", "captain"),
        award("champion_roster", "player"),
        award("individual_winners", "Most Valuable Player"),
        award("individual_winners", "Most Valuable Player"),
        award("individual_winners", "Best Opposite Hitter"),
        award("individual_winners", "Finals MVP"),
        award("runner_up", "Runner Up"),
        award("all_star", "Opposite"),
    ],
};

describe("buildRepresentativeCard", () => {
    it("sums every season into all-time stats in the configured order", () => {
        const card = buildRepresentativeCard(EU_PLAYER, detail);
        expect(card.stats).toEqual([
            {label: "AST", value: "196"},
            {label: "SET%", value: "98.0%"},
            {label: "PTS", value: "46"},
            {label: "ACE", value: "10"},
        ]);
        expect(buildRepresentativeCard(AS_PLAYER, detail).stats).toEqual([
            {label: "PTS", value: "46"},
            {label: "PTS/S", value: "2.97"},
            {label: "HIT%", value: "40.0%"},
            {label: "REC", value: "25"},
        ]);
    });

    it("matches the all-time leaderboard formulas", () => {
        const card = buildRepresentativeCard(AS_PLAYER, detail);
        const [career] = aggregateCareerRows(
            rows.map(r => ({...r, player_id: "p", region_id: "r", season_start_date: "2026-01-01"})) as unknown as PlayerLeaderboardRow[],
        );
        expect(card.stats.find(s => s.label === "PTS")?.value).toBe(String(career.points_total));
        expect(card.stats.find(s => s.label === "HIT%")?.value).toBe(`${(career.hit_eff! * 100).toFixed(1)}%`);
    });

    it("counts honours by rule and drops zero counts", () => {
        expect(buildRepresentativeCard(AS_PLAYER, detail).awards).toEqual([
            {count: 2, label: "Champion"},
            {count: 2, label: "Most Valuable Player"},
            {count: 1, label: "Best Opposite"},
        ]);
        expect(buildRepresentativeCard(EU_PLAYER, detail).awards).toEqual([
            {count: 2, label: "Champion"},
            {count: 2, label: "Most Valuable Player"},
        ]);
    });

    it("prefers the override, then display_name, then username", () => {
        expect(buildRepresentativeCard(AS_PLAYER, detail).displayName).toBe("KenyMighto");
        expect(buildRepresentativeCard(EU_PLAYER, detail).displayName).toBe("Nickeyy");
        expect(
            buildRepresentativeCard(EU_PLAYER, {...detail, player: {...detail.player, display_name: null}}).displayName,
        ).toBe("chrathniaggedio");
    });

    it("falls back to config when the detail is null", () => {
        expect(buildRepresentativeCard(AS_PLAYER, null)).toEqual({
            displayName: "KenyMighto",
            username: "EAEAEAEAEAEAEA22",
            avatarUrl: null,
            position: "Opposite",
            stats: [],
            awards: [],
        });
    });

    it("renders a dash for stats with no denominator", () => {
        const card = buildRepresentativeCard(AS_PLAYER, {...detail, seasonStats: []});
        expect(card.stats.map(s => s.value)).toEqual(["0", "–", "–", "0"]);
    });
});

describe("fitNameSize", () => {
    it("fits names with the player-card rule", () => {
        expect(fitNameSize(400, 374)).toBe(60);
        expect(fitNameSize(1100, 374)).toBe(34);
        expect(fitNameSize(1100, 480)).toBe(43.5);
        expect(fitNameSize(2000, 374)).toBe(28);
    });
});
