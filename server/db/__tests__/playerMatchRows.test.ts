import {describe, expect, it} from "vitest";
import type {DBClient} from "@/shared/types/db";
import {findMatchIdsWithStats, findPlayerOwnMatchRows} from "../matches.repo";

const STAT_COLUMNS = [
    "ape_kills", "ape_attempts", "delay_kills", "quick_kills", "wipes_tools", "kill_attempts", "spiking_errors",
    "assists", "setting_errors", "kill_blocks", "block_touches", "serve_receives", "digs", "block_follows",
    "dives", "aces", "jump_serve_aces", "float_aces", "service_errors", "misc_errors", "receive_errors",
];

function stubClient(rows: Record<string, unknown>[]) {
    const orFilters: string[] = [];
    const startQuery = () => {
        let matching = rows;
        let window: [number, number] | null = null;
        const builder = {
            select: () => builder,
            order: () => builder,
            in: () => builder,
            eq(column: string, value: unknown) {
                matching = matching.filter(row => row[column] === undefined || row[column] === value);
                return builder;
            },
            range(from: number, to: number) {
                window = [from, to];
                return builder;
            },
            or(filter: string) {
                orFilters.push(filter);
                return builder;
            },
            then(resolve: (value: {data: unknown; error: null}) => unknown) {
                const data = window ? matching.slice(window[0], window[1] + 1) : matching.slice(0, 1000);
                return Promise.resolve({data, error: null}).then(resolve);
            },
        };
        return builder;
    };
    return {client: {from: startQuery} as unknown as DBClient, orFilters};
}

function expectPlayedFilter(filter: string | undefined) {
    expect(filter).toBeDefined();
    const parts = filter!.split(",");
    expect(parts).toHaveLength(STAT_COLUMNS.length);
    for (const column of STAT_COLUMNS) expect(parts).toContain(`${column}.gt.0`);
}

describe("played stat rows", () => {
    it("reads only a player's played rows, so a bench row does not count", async () => {
        const {client, orFilters} = stubClient([{match_id: "m1", team_id: "a"}, {match_id: "m1", team_id: "a"}]);
        const result = await findPlayerOwnMatchRows(client, "p1");
        expectPlayedFilter(orFilters[0]);
        expect(result).toEqual({ok: true, value: [{matchId: "m1", teamId: "a"}]});
    });

    it("treats a match as having stats only when someone played in it", async () => {
        const {client, orFilters} = stubClient([{match_id: "m1"}]);
        const result = await findMatchIdsWithStats(client, ["m1", "m2"]);
        expectPlayedFilter(orFilters[0]);
        expect(result.ok && [...result.value]).toEqual(["m1"]);
    });

    it("counts a match whose first set was forfeited, where played rows start at set 2", async () => {
        const {client} = stubClient([{match_id: "forfeited-set-1", set_number: 2}]);
        const result = await findMatchIdsWithStats(client, ["forfeited-set-1"]);
        expect(result.ok && [...result.value]).toEqual(["forfeited-set-1"]);
    });

    it("keeps reading past PostgREST's 1000 row page", async () => {
        const rows = [
            ...Array.from({length: 2300}, () => ({match_id: "m1", set_number: 1})),
            {match_id: "last-page-match", set_number: 1},
        ];
        const {client} = stubClient(rows);
        const result = await findMatchIdsWithStats(client, ["m1", "last-page-match"]);
        expect(result.ok && [...result.value].sort()).toEqual(["last-page-match", "m1"]);
    });
});
