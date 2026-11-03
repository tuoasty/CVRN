import {beforeEach, describe, expect, it, vi} from "vitest";
import {Err, Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";
import {addAwardName} from "../addAwardName";

const mocks = vi.hoisted(() => ({
    findAwardNames: vi.fn(),
    insertAwardName: vi.fn(),
}));

vi.mock("@/server/db/seasonHistory.repo", () => mocks);

const supabase = {} as DBClient;

function listRow(name: string, sortOrder: number) {
    return {name, sort_order: sortOrder, created_at: "2026-11-04T00:00:00Z", created_by: null};
}

describe("addAwardName", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.findAwardNames.mockResolvedValue(Ok([listRow("Most Valuable Player", 10), listRow("Playoff Rising Star", 160)]));
    });

    it("adds the name after the end of the list and returns the saved name", async () => {
        mocks.insertAwardName.mockResolvedValue(Ok(listRow("Best Digger", 170)));

        const result = await addAwardName(supabase, {name: "Best Digger"});

        expect(mocks.insertAwardName).toHaveBeenCalledWith(supabase, {name: "Best Digger", sortOrder: 170});
        expect(result).toEqual(Ok("Best Digger"));
    });

    it("passes a conflict through unchanged", async () => {
        const conflict = Err({message: "That award is already on the list", code: "CONFLICT" as const});
        mocks.insertAwardName.mockResolvedValue(conflict);

        const result = await addAwardName(supabase, {name: "Finals MVP"});

        expect(result).toEqual(conflict);
    });
});
