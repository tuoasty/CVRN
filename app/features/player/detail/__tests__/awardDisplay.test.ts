import {describe, expect, it} from "vitest";
import type {PlayerAward} from "@/server/domains/player";
import {selectPlayerRecord} from "../awardDisplay";

function award(id: string, category: string): PlayerAward {
    return {
        id,
        award_name: id,
        category,
        season_id: "s",
        season_name: "Season 2",
        season_slug: "season-2",
        region_code: "EU",
        team_name: null,
        team_slug: null,
        team_disbanded: false,
        awarded_at: null,
        team_logo_url: null,
        team_logo_bg_removed: false,
        season_start_date: "2026-01-01",
    };
}

describe("selectPlayerRecord", () => {
    it("splits podium rows from awards and leaves staff team out of both", () => {
        const {achievements, awardList} = selectPlayerRecord(
            [award("champ", "champion_roster"), award("second", "runner_up"), award("mvp", "individual_winners"), award("staff", "staff_team")],
            [],
        );
        expect(achievements.map(a => a.id)).toEqual(["champ", "second"]);
        expect(awardList.map(item => item.key)).toEqual(["award:mvp"]);
    });
});
