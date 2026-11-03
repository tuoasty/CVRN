import {beforeEach, describe, expect, it, vi} from "vitest";
import {Ok} from "@/shared/types/result";
import type {DBClient} from "@/shared/types/db";
import {getAwardNameSuggestions} from "../getAwardNameSuggestions";

const mocks = vi.hoisted(() => ({
    findAwardNames: vi.fn(),
    findAwardNamesByCategory: vi.fn(),
}));

vi.mock("@/server/db/seasonHistory.repo", () => mocks);

const supabase = {} as DBClient;

function listRow(name: string, sortOrder: number) {
    return {name, sort_order: sortOrder, created_at: "2026-11-04T00:00:00Z", created_by: null};
}

describe("getAwardNameSuggestions", () => {
    beforeEach(() => vi.clearAllMocks());

    it("returns the award list in its order for individual awards", async () => {
        mocks.findAwardNames.mockResolvedValue(Ok([listRow("Most Valuable Player", 10), listRow("Finals MVP", 20)]));

        const result = await getAwardNameSuggestions(supabase, {category: "individual_winners"});

        expect(result).toEqual(Ok(["Most Valuable Player", "Finals MVP"]));
        expect(mocks.findAwardNamesByCategory).not.toHaveBeenCalled();
    });

    it("keeps deduped history for other categories", async () => {
        mocks.findAwardNamesByCategory.mockResolvedValue(Ok([
            {award_name: "Setter", created_at: "2026-11-02T00:00:00Z"},
            {award_name: "setter", created_at: "2026-11-01T00:00:00Z"},
            {award_name: "Libero", created_at: "2026-10-01T00:00:00Z"},
        ]));

        const result = await getAwardNameSuggestions(supabase, {category: "all_star"});

        expect(result).toEqual(Ok(["Setter", "Libero"]));
        expect(mocks.findAwardNames).not.toHaveBeenCalled();
    });
});
