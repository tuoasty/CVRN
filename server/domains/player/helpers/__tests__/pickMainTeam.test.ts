import {describe, expect, it} from "vitest";
import type {PlayerTeamHistoryEntry} from "../../types";
import {pickMainTeam} from "../pickMainTeam";

const NOW = new Date("2026-11-03T00:00:00.000Z");

function entry(teamId: string, regionCode: string, patch: Partial<PlayerTeamHistoryEntry> = {}): PlayerTeamHistoryEntry {
    return {
        team_id: teamId,
        team_name: teamId,
        team_slug: teamId,
        team_logo_url: null,
        team_logo_bg_removed: false,
        team_brick_color: null,
        team_disbanded: false,
        season_id: `s3-${regionCode}`,
        season_name: "Season 3",
        region_code: regionCode,
        region_name: regionCode,
        season_slug: "season-3",
        league_type: "main",
        role: "player",
        position: null,
        joined_at: "2026-10-01T00:00:00.000Z",
        left_at: null,
        season_start_date: "2026-10-01",
        season_end_date: null,
        ...patch,
    };
}

const stat = (seasonId: string, regionCode: string, setsPlayed: number) => ({
    season_id: seasonId,
    region_code: regionCode,
    sets_played: setsPlayed,
});

describe("pickMainTeam", () => {
    it("does not count a team whose season ends at this exact instant as active", () => {
        const history = [
            entry("na-team", "NA", {season_end_date: "2026-11-03T00:00:00.000Z"}),
            entry("eu-team", "EU"),
        ];
        expect(pickMainTeam(history, [stat("s2-NA", "NA", 50)], NOW)).toBeNull();
    });

    it("picks the team in the region with the most sets, even when another joined later", () => {
        const history = [
            entry("na-team", "NA", {joined_at: "2026-10-20T00:00:00.000Z"}),
            entry("eu-team", "EU"),
        ];
        const stats = [stat("s2-EU", "EU", 33), stat("s2-NA", "NA", 0)];
        expect(pickMainTeam(history, stats, NOW)?.team_id).toBe("eu-team");
    });

    it("adds sets across seasons of the same region", () => {
        const history = [entry("na-team", "NA"), entry("eu-team", "EU")];
        const stats = [stat("s1-EU", "EU", 10), stat("s2-EU", "EU", 10), stat("s2-NA", "NA", 15)];
        expect(pickMainTeam(history, stats, NOW)?.team_id).toBe("eu-team");
    });

    it("keeps history order on equal sets", () => {
        const history = [entry("na-team", "NA"), entry("eu-team", "EU")];
        const stats = [stat("s2-EU", "EU", 12), stat("s2-NA", "NA", 12)];
        expect(pickMainTeam(history, stats, NOW)?.team_id).toBe("na-team");
    });

    it("does not count sets from a side league season", () => {
        const history = [
            entry("na-team", "NA"),
            entry("eu-team", "EU"),
            entry("old-side", "EU", {season_id: "side-EU", league_type: "side", season_end_date: "2026-01-01"}),
        ];
        const stats = [stat("side-EU", "EU", 50), stat("s2-NA", "NA", 3)];
        expect(pickMainTeam(history, stats, NOW)?.team_id).toBe("na-team");
    });

    it("prefers a main league team over a side league team with more sets in its region", () => {
        const history = [
            entry("side-team", "EU", {season_id: "side-EU", league_type: "side"}),
            entry("main-team", "NA"),
        ];
        expect(pickMainTeam(history, [stat("s2-EU", "EU", 40)], NOW)?.team_id).toBe("main-team");
    });

    it("falls back to side league teams when no main league team is active", () => {
        const history = [
            entry("side-a", "EU", {season_id: "side-EU", league_type: "side"}),
            entry("side-b", "NA", {season_id: "side-NA", league_type: "side"}),
        ];
        expect(pickMainTeam(history, [], NOW)?.team_id).toBe("side-a");
    });

    it("returns null with one active team", () => {
        expect(pickMainTeam([entry("eu-team", "EU")], [], NOW)).toBeNull();
    });

    it("returns null when every season has ended", () => {
        const history = [
            entry("eu-team", "EU", {season_end_date: "2026-06-01"}),
            entry("na-team", "NA", {season_end_date: "2026-06-01"}),
        ];
        expect(pickMainTeam(history, [], NOW)).toBeNull();
    });

    it("does not treat a team the player left as active", () => {
        const history = [
            entry("eu-team", "EU", {left_at: "2026-10-15T00:00:00.000Z"}),
            entry("na-team", "NA"),
        ];
        expect(pickMainTeam(history, [stat("s2-EU", "EU", 40)], NOW)).toBeNull();
    });
});
