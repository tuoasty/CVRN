import {describe, it, expect} from "vitest";
import type {PlayerLeaderboardRow} from "@/server/domains/player";
import type {RosterPlayer} from "@/server/domains/match";
import {buildPreMatchTeam} from "../buildPreMatchTeam";

const SEASON = "s3";
const REGION = "na";

function roster(id: string, role: RosterPlayer["role"] = "player"): RosterPlayer {
    return {player_id: id, display_name: id.toUpperCase(), username: id, avatar_url: null, role};
}

function row(o: Partial<PlayerLeaderboardRow>): PlayerLeaderboardRow {
    return {
        player_id: "p1",
        region_id: REGION,
        season_id: "s1",
        sets_played: 10,
        matches_played: 3,
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
        position_counts: {OUT: 5},
        ...o,
    } as unknown as PlayerLeaderboardRow;
}

const cell = (team: ReturnType<typeof buildPreMatchTeam>, playerId: string, label: string) =>
    team.sections.flatMap(s => s.players).find(p => p.playerId === playerId)?.line.find(c => c.label === label)?.value;

describe("buildPreMatchTeam", () => {
    it("uses all-time when nobody on the team has season stats", () => {
        const team = buildPreMatchTeam({
            roster: [roster("p1")],
            rows: [row({player_id: "p1", season_id: "s1", sets_played: 10, ape_kills_total: 20})],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(team.source).toBe("alltime");
        expect(team.sections[0].players[0].setsPlayed).toBe(10);
        expect(cell(team, "p1", "K/set")).toBe("2.0");
    });

    it("uses season stats when any player on the team has them, and season-less players go to No stats yet", () => {
        const team = buildPreMatchTeam({
            roster: [roster("p1"), roster("p2")],
            rows: [
                row({player_id: "p1", season_id: SEASON, sets_played: 4, ape_kills_total: 4}),
                row({player_id: "p1", season_id: "s1", sets_played: 10, ape_kills_total: 40}),
                row({player_id: "p2", season_id: "s1", sets_played: 10}),
            ],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(team.source).toBe("season");
        expect(cell(team, "p1", "K/set")).toBe("1.0");
        expect(team.sections.map(s => s.label)).toEqual(["Outside Hitter", "No stats yet"]);
        expect(team.sections[1].players.map(p => p.playerId)).toEqual(["p2"]);
    });

    it("recomputes all-time ratios from summed totals", () => {
        const team = buildPreMatchTeam({
            roster: [roster("p1")],
            rows: [
                row({player_id: "p1", season_id: "s1", sets_played: 2, ape_kills_total: 10, kill_attempts_total: 10, spiking_errors_total: 0, position_counts: {OPP: 2}}),
                row({player_id: "p1", season_id: "s2", sets_played: 40, ape_kills_total: 10, kill_attempts_total: 90, spiking_errors_total: 10, position_counts: {OPP: 40}}),
            ],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(cell(team, "p1", "HIT%")).toBe("10.0%");
    });

    it("sections by all-time main position even when showing season stats", () => {
        const team = buildPreMatchTeam({
            roster: [roster("p1")],
            rows: [
                row({player_id: "p1", season_id: SEASON, sets_played: 3, position_counts: {LIB: 3}}),
                row({player_id: "p1", season_id: "s1", sets_played: 30, position_counts: {SET: 30}}),
            ],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(team.sections[0].position).toBe("SET");
        expect(team.sections[0].players[0].line[0].label).toBe("AST/set");
    });

    it("sums two season rows when a player changed teams this season", () => {
        const team = buildPreMatchTeam({
            roster: [roster("p1")],
            rows: [
                row({player_id: "p1", season_id: SEASON, sets_played: 3, ape_kills_total: 3}),
                row({player_id: "p1", season_id: SEASON, sets_played: 3, ape_kills_total: 9}),
            ],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(team.sections[0].players[0].setsPlayed).toBe(6);
        expect(cell(team, "p1", "K/set")).toBe("2.0");
    });

    it("players with stats but no recorded position go to No stats yet with no line", () => {
        const team = buildPreMatchTeam({
            roster: [roster("p1"), roster("p2")],
            rows: [row({player_id: "p1", season_id: "s1", sets_played: 10, position_counts: null, assists_total: 30})],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(team.sections.map(s => s.key)).toEqual(["none"]);
        expect(team.sections[0].players.map(p => p.line)).toEqual([[], []]);
    });

    it.each([
        ["SET", ["AST/set", "SET%", "APK/set"]],
        ["OPP", ["PTS/set", "K/set", "HIT%"]],
        ["OUT", ["PTS/set", "K/set", "REC/set"]],
        ["MID", ["B/set", "KB/set", "KB%"]],
        ["LIB", ["REC/set", "DIG/set", "DIV/set"]],
    ])("%s shows its three stats", (position, labels) => {
        const team = buildPreMatchTeam({
            roster: [roster("p1")],
            rows: [row({player_id: "p1", position_counts: {[position]: 3}})],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(team.sections[0].players[0].line.map(c => c.label)).toEqual(labels);
    });

    it("ignores other regions", () => {
        const team = buildPreMatchTeam({
            roster: [roster("p1")],
            rows: [row({player_id: "p1", region_id: "eu", sets_played: 10})],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(team.sections).toEqual([{key: "none", position: null, label: "No stats yet", players: [expect.objectContaining({playerId: "p1", line: []})]}]);
    });

    it("orders sections by position and players by sets played", () => {
        const team = buildPreMatchTeam({
            roster: [roster("lib"), roster("oh1"), roster("oh2"), roster("set")],
            rows: [
                row({player_id: "lib", position_counts: {LIB: 4}}),
                row({player_id: "oh1", sets_played: 5}),
                row({player_id: "oh2", sets_played: 20}),
                row({player_id: "set", position_counts: {SET: 4}}),
            ],
            seasonId: SEASON,
            regionId: REGION,
        });
        expect(team.sections.map(s => s.position)).toEqual(["SET", "OUT", "LIB"]);
        expect(team.sections[1].players.map(p => p.playerId)).toEqual(["oh2", "oh1"]);
    });
});
