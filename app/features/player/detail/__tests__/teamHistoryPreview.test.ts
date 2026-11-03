import {describe, expect, it} from "vitest";
import type {PlayerTeamHistoryEntry} from "@/server/domains/player";
import {otherActiveTeams, selectTeamHistoryPreview} from "../teamHistoryPreview";

const NOW = new Date("2026-11-03T00:00:00.000Z");

function entry(teamId: string, seasonId: string, patch: Partial<PlayerTeamHistoryEntry> = {}): PlayerTeamHistoryEntry {
    return {
        team_id: teamId,
        team_name: teamId,
        team_slug: teamId,
        team_logo_url: null,
        team_logo_bg_removed: false,
        team_brick_color: null,
        team_disbanded: false,
        season_id: seasonId,
        season_name: seasonId,
        region_code: "EU",
        region_name: "Europe",
        season_slug: seasonId,
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

const ended = (teamId: string, seasonId: string, patch: Partial<PlayerTeamHistoryEntry> = {}) =>
    entry(teamId, seasonId, {season_start_date: "2026-01-01", season_end_date: "2026-06-01", ...patch});

const ids = (rows: PlayerTeamHistoryEntry[]) => rows.map(r => `${r.team_id}/${r.season_id}`);

describe("selectTeamHistoryPreview", () => {
    it("keeps every active season row and one row per ended season", () => {
        const history = [
            entry("a", "s3"),
            entry("b", "s3-na"),
            entry("c", "s3-sa", {left_at: "2026-10-10T00:00:00.000Z"}),
            ended("x", "s2", {joined_at: "2026-03-01T00:00:00.000Z", left_at: "2026-04-01T00:00:00.000Z"}),
            ended("y", "s2", {joined_at: "2026-02-01T00:00:00.000Z"}),
            ended("z", "s2", {joined_at: "2026-01-01T00:00:00.000Z", left_at: "2026-02-01T00:00:00.000Z"}),
        ];
        const {visible, hiddenCount} = selectTeamHistoryPreview(history, NOW);
        expect(visible).toHaveLength(4);
        expect(hiddenCount).toBe(2);
        expect(visible[3].team_id).toBe("y");
    });

    it("uses the latest join when every ended season entry has left", () => {
        const history = [
            ended("x", "s2", {joined_at: "2026-02-01T00:00:00.000Z", left_at: "2026-03-01T00:00:00.000Z"}),
            ended("y", "s2", {joined_at: "2026-04-01T00:00:00.000Z", left_at: "2026-05-01T00:00:00.000Z"}),
        ];
        expect(ids(selectTeamHistoryPreview(history, NOW).visible)).toEqual(["y/s2"]);
    });

    it("gives two regions of the same season number one row each", () => {
        const history = [ended("x", "s2-eu"), ended("y", "s2-na", {region_code: "NA"})];
        expect(selectTeamHistoryPreview(history, NOW).visible).toHaveLength(2);
    });

    it("puts ended seasons after active rows, newest first", () => {
        const history = [
            ended("old", "s1", {season_start_date: "2025-01-01"}),
            ended("mid", "s2", {season_start_date: "2026-01-01"}),
            entry("now", "s3"),
        ];
        expect(ids(selectTeamHistoryPreview(history, NOW).visible)).toEqual(["now/s3", "mid/s2", "old/s1"]);
    });
});

describe("otherActiveTeams", () => {
    it("excludes the main team, left teams and ended seasons", () => {
        const history = [
            entry("main", "s3"),
            entry("other", "s3-na"),
            entry("left", "s3-sa", {left_at: "2026-10-10T00:00:00.000Z"}),
            ended("old", "s2"),
        ];
        const result = otherActiveTeams(history, {team_id: "main", season_id: "s3"}, NOW);
        expect(ids(result)).toEqual(["other/s3-na"]);
    });

    it("returns every active team when there is no main team", () => {
        expect(otherActiveTeams([entry("a", "s3")], null, NOW)).toHaveLength(1);
    });
});
