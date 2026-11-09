import {describe, expect, it} from "vitest";
import {groupUpcoming} from "../groupUpcoming";
import {makeMatch} from "./fixtures";

const TZ = "Asia/Singapore";
const NOW = new Date("2026-11-12T02:00:00Z");

describe("groupUpcoming", () => {
    it("groups by day in region time", () => {
        const todayLate = makeMatch({week: 4, scheduled_at: "2026-11-12T13:00:00Z"});
        const todayEarly = makeMatch({week: 4, scheduled_at: "2026-11-12T11:00:00Z"});
        const saturday = makeMatch({week: 4, scheduled_at: "2026-11-14T11:00:00Z"});
        const crossesMidnight = makeMatch({week: 4, scheduled_at: "2026-11-12T17:00:00Z"});

        const days = groupUpcoming([saturday, crossesMidnight, todayLate, todayEarly], TZ, NOW);

        expect(days.map(d => [d.key, d.label, d.isToday])).toEqual([
            ["2026-11-12", "Today · Thu 12", true],
            ["2026-11-13", "Fri 13", false],
            ["2026-11-14", "Sat 14", false],
        ]);
        expect(days[0].matches.map(m => m.match.id)).toEqual([todayEarly.match.id, todayLate.match.id]);
        expect(days[1].matches.map(m => m.match.id)).toEqual([crossesMidnight.match.id]);
    });

    it("matches from different weeks or rounds share one day list", () => {
        const upper = makeMatch({match_type: "playoffs", round: "upper_final", scheduled_at: "2026-11-14T13:00:00Z"});
        const lower = makeMatch({match_type: "playoffs", round: "losers_round_2", scheduled_at: "2026-11-14T11:00:00Z"});
        const days = groupUpcoming([upper, lower], TZ, NOW);
        expect(days).toHaveLength(1);
        expect(days[0].matches.map(m => m.match.id)).toEqual([lower.match.id, upper.match.id]);
    });

    it("null scheduled_at goes to Date TBD at the end and is never today", () => {
        const dated = makeMatch({week: 4, scheduled_at: "2026-11-12T11:00:00Z"});
        const tbd = makeMatch({week: 4, scheduled_at: null, status: "pending"});
        const days = groupUpcoming([tbd, dated], TZ, NOW);
        expect(days.map(d => d.key)).toEqual(["2026-11-12", "tbd"]);
        expect(days[1]).toMatchObject({label: "Date TBD", isToday: false});
        expect(days[1].matches.map(m => m.match.id)).toEqual([tbd.match.id]);
    });

    it("drops matches from a past region day that never got a result", () => {
        const overdue = makeMatch({week: 3, scheduled_at: "2026-11-10T11:00:00Z"});
        const earlierToday = makeMatch({week: 4, scheduled_at: "2026-11-11T17:00:00Z"});
        const days = groupUpcoming([overdue, earlierToday], TZ, NOW);
        expect(days).toHaveLength(1);
        expect(days[0].isToday).toBe(true);
        expect(days[0].matches.map(m => m.match.id)).toEqual([earlierToday.match.id]);
    });
});
