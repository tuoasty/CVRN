import {describe, expect, it} from "vitest";
import {isPlayerBehind} from "../careerBack";

const origin = "http://localhost:3000";
const entries = (...paths: string[]) => paths.map(path => `${origin}${path}`);

describe("isPlayerBehind", () => {
    it("is true when the entry before Career is that player", () => {
        const urls = entries("/records", "/players/nickeyy", "/players/nickeyy/career");
        expect(isPlayerBehind(urls, 2, "/players/nickeyy")).toBe(true);
    });

    it("ignores username case", () => {
        const urls = entries("/players/GoPrehistoric", "/players/goprehistoric/career");
        expect(isPlayerBehind(urls, 1, "/players/goprehistoric")).toBe(true);
    });

    it("ignores a hash on the previous entry", () => {
        const urls = entries("/players/nickeyy#top", "/players/nickeyy/career#awards");
        expect(isPlayerBehind(urls, 1, "/players/nickeyy")).toBe(true);
    });

    it("is false for another page", () => {
        const urls = entries("/records", "/players/nickeyy/career");
        expect(isPlayerBehind(urls, 1, "/players/nickeyy")).toBe(false);
    });

    it("is false for another player", () => {
        const urls = entries("/players/someone", "/players/nickeyy/career");
        expect(isPlayerBehind(urls, 1, "/players/nickeyy")).toBe(false);
    });

    it("is false when Career is the first entry", () => {
        expect(isPlayerBehind(entries("/players/nickeyy/career"), 0, "/players/nickeyy")).toBe(false);
    });
});
