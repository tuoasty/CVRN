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
    const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        or(filter: string) {
            orFilters.push(filter);
            return builder;
        },
        then(resolve: (value: {data: unknown; error: null}) => unknown) {
            return Promise.resolve({data: rows, error: null}).then(resolve);
        },
    };
    return {client: {from: () => builder} as unknown as DBClient, orFilters};
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
});
