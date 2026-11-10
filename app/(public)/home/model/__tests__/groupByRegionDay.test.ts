import {describe, expect, it} from "vitest";
import {groupByRegionDay} from "../groupUpcoming";
import {makeMatch} from "./fixtures";
import {formatRegionFullDate} from "../format";

const TZ = "Asia/Singapore";
const NOW = new Date("2026-11-12T02:00:00Z");

describe("groupByRegionDay", () => {
    it("keeps the input order of days and matches, newest first for results", () => {
        const sunLate = makeMatch({status: "completed", scheduled_at: "2026-11-08T13:00:00Z"});
        const sunEarly = makeMatch({status: "completed", scheduled_at: "2026-11-08T11:00:00Z"});
        const sat = makeMatch({status: "completed", scheduled_at: "2026-11-07T11:00:00Z"});
        const days = groupByRegionDay([sunLate, sunEarly, sat], TZ, NOW, "Undated");
        expect(days.map(d => [d.key, d.label])).toEqual([["2026-11-08", "Sun 8"], ["2026-11-07", "Sat 7"]]);
        expect(days[0].matches.map(m => m.match.id)).toEqual([sunLate.match.id, sunEarly.match.id]);
    });

    it("labels today and undated groups", () => {
        const today = makeMatch({status: "completed", scheduled_at: "2026-11-12T01:00:00Z"});
        const undated = makeMatch({status: "completed", scheduled_at: null});
        const days = groupByRegionDay([today, undated], TZ, NOW, "Undated");
        expect(days[0]).toMatchObject({label: "Today · Thu 12", isToday: true});
        expect(days[1]).toMatchObject({key: "tbd", label: "Undated", isToday: false});
    });

    it("uses the given day formatter for dated groups", () => {
        const sat = makeMatch({status: "completed", scheduled_at: "2026-11-07T11:00:00Z"});
        const today = makeMatch({status: "completed", scheduled_at: "2026-11-12T01:00:00Z"});
        const days = groupByRegionDay([today, sat], TZ, NOW, "Undated", formatRegionFullDate);
        expect(days.map(d => d.label)).toEqual(["Today · Nov 12, 2026", "Nov 7, 2026"]);
    });
});
