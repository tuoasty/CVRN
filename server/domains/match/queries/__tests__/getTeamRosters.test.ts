import {describe, expect, it} from "vitest";
import {wasOnRosterAt} from "../getTeamRosters";

const at = "2026-05-10T12:00:00.000Z";

describe("wasOnRosterAt", () => {
    it("keeps an active member who joined before the match", () => {
        expect(wasOnRosterAt({joined_at: "2026-05-01T00:00:00.000Z", left_at: null}, {at, trustJoinedAt: true})).toBe(true);
    });

    it("drops a member who left before the match", () => {
        expect(wasOnRosterAt({joined_at: "2026-04-01T00:00:00.000Z", left_at: "2026-05-05T00:00:00.000Z"}, {at, trustJoinedAt: true})).toBe(false);
    });

    it("keeps a member who left after the match", () => {
        expect(wasOnRosterAt({joined_at: "2026-04-01T00:00:00.000Z", left_at: "2026-05-20T00:00:00.000Z"}, {at, trustJoinedAt: true})).toBe(true);
    });

    it("drops a member who joined after the match from season 2 on", () => {
        expect(wasOnRosterAt({joined_at: "2026-05-15T00:00:00.000Z", left_at: null}, {at, trustJoinedAt: true})).toBe(false);
    });

    it("ignores joined_at in season 1", () => {
        expect(wasOnRosterAt({joined_at: "2026-05-15T00:00:00.000Z", left_at: null}, {at, trustJoinedAt: false})).toBe(true);
    });

    it("still drops a season 1 member who left before the match", () => {
        expect(wasOnRosterAt({joined_at: "2026-05-15T00:00:00.000Z", left_at: "2026-05-01T00:00:00.000Z"}, {at, trustJoinedAt: false})).toBe(false);
    });
});
