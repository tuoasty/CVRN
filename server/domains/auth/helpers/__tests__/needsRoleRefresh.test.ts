import {describe, expect, it} from "vitest";
import {needsRoleRefresh} from "../needsRoleRefresh";

const now = new Date("2026-11-11T12:00:00.000Z");

describe("needsRoleRefresh", () => {
    it("refreshes when never verified", () => {
        expect(needsRoleRefresh(null, now)).toBe(true);
    });

    it("refreshes when expired", () => {
        expect(needsRoleRefresh("2026-11-11T11:59:00.000Z", now)).toBe(true);
    });

    it("refreshes within 30 seconds of expiry", () => {
        expect(needsRoleRefresh("2026-11-11T12:00:20.000Z", now)).toBe(true);
    });

    it("does not refresh with more than 30 seconds left", () => {
        expect(needsRoleRefresh("2026-11-11T12:01:00.000Z", now)).toBe(false);
    });
});
