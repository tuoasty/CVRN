import {describe, expect, it} from "vitest";
import {INITIAL_WHEEL, keyIntent, nextWheel, type WheelState} from "../landingGestures";

interface Ev {
    deltaY: number;
    now: number;
    scrollY?: number;
    atTopFor?: number;
    deltaMode?: number;
    view: "menu" | "league";
}

function run(events: Ev[]) {
    let state: WheelState = INITIAL_WHEEL;
    return events.map(e => {
        const r = nextWheel(state, {
            deltaY: e.deltaY,
            deltaMode: e.deltaMode ?? 0,
            now: e.now,
            scrollY: e.scrollY ?? 0,
            atTopFor: e.atTopFor ?? Infinity,
            view: e.view,
        });
        state = r.state;
        return r;
    });
}

const TAIL_FROM_BELOW: Ev[] = [
    {deltaY: -60.5, now: 0, scrollY: 900, atTopFor: 0, view: "menu"},
    {deltaY: -40.5, now: 100, scrollY: 300, atTopFor: 0, view: "menu"},
    {deltaY: -20.5, now: 200, scrollY: 0, atTopFor: 50, view: "menu"},
    {deltaY: -10.5, now: 300, scrollY: 0, atTopFor: 150, view: "menu"},
    {deltaY: -5.5, now: 400, scrollY: 0, atTopFor: 250, view: "menu"},
    {deltaY: -3.5, now: 500, scrollY: 0, atTopFor: 350, view: "menu"},
];

describe("nextWheel", () => {
    it("enters league on a wheel-up at rest on the menu", () => {
        const [r] = run([{deltaY: -40.5, now: 1000, view: "menu"}]);
        expect(r).toMatchObject({intent: "league", swallow: true});
    });

    it("never enters league from trackpad momentum carried up from below", () => {
        expect(run(TAIL_FROM_BELOW).map(r => r.intent)).toEqual([null, null, null, null, null, null]);
    });

    it("enters league on a fresh trackpad swipe during the momentum tail once the page has settled", () => {
        const rs = run([...TAIL_FROM_BELOW, {deltaY: -24, now: 550, scrollY: 0, atTopFor: 400, view: "menu"}]);
        expect(rs[rs.length - 1].intent).toBe("league");
    });

    it("enters league from a mouse notch stream once the page has settled at the top", () => {
        const rs = run([
            {deltaY: -100, now: 0, scrollY: 600, atTopFor: 0, view: "menu"},
            {deltaY: -100, now: 120, scrollY: 0, atTopFor: 100, view: "menu"},
            {deltaY: -100, now: 240, scrollY: 0, atTopFor: 260, view: "menu"},
        ]);
        expect(rs.map(r => r.intent)).toEqual([null, null, "league"]);
    });

    it("counts a line-mode wheel notch", () => {
        const [r] = run([{deltaY: -3, deltaMode: 1, now: 1000, view: "menu"}]);
        expect(r.intent).toBe("league");
    });

    it("swallows the rest of the gesture that entered league", () => {
        const rs = run([
            {deltaY: -20.5, now: 0, view: "menu"},
            {deltaY: -10.5, now: 50, view: "league"},
        ]);
        expect(rs[1]).toMatchObject({intent: null, swallow: true});
    });

    it("returns to menu as soon as the swipe reverses during the entering tail", () => {
        const rs = run([
            {deltaY: -20.5, now: 0, view: "menu"},
            {deltaY: -8.5, now: 100, view: "league"},
            {deltaY: -4.5, now: 200, view: "league"},
            {deltaY: 12.5, now: 260, view: "league"},
        ]);
        expect(rs[3].intent).toBe("menu");
    });

    it("returns to menu on wheel-down in league", () => {
        const [r] = run([{deltaY: 30.5, now: 1000, view: "league"}]);
        expect(r.intent).toBe("menu");
    });

    it("swallows a long momentum tail after leaving league", () => {
        const tail: Ev[] = [];
        for (let t = 100; t <= 3000; t += 100) tail.push({deltaY: 10.5, now: t, view: "menu"});
        const rs = run([{deltaY: 30.5, now: 0, view: "league"}, ...tail]);
        expect(rs.slice(1).every(r => r.swallow && r.intent === null)).toBe(true);
    });

    it("lets the menu scroll down natively once the tail has stopped", () => {
        const rs = run([
            {deltaY: 30.5, now: 0, view: "league"},
            {deltaY: 30.5, now: 500, view: "menu"},
        ]);
        expect(rs[1]).toMatchObject({intent: null, swallow: false});
    });

    it("ignores tiny deltas", () => {
        const [r] = run([{deltaY: -2, now: 1000, view: "menu"}]);
        expect(r.intent).toBeNull();
    });

    it("does not enter league when the page is not at the top", () => {
        const [r] = run([{deltaY: -40.5, now: 1000, scrollY: 500, atTopFor: 0, view: "menu"}]);
        expect(r).toMatchObject({intent: null, swallow: false});
    });
});

describe("keyIntent", () => {
    it("enters league with PageUp and ArrowUp at the top of the menu", () => {
        expect(keyIntent({key: "PageUp", view: "menu", scrollY: 0, targetIsInteractive: false})).toBe("league");
        expect(keyIntent({key: "ArrowUp", view: "menu", scrollY: 0, targetIsInteractive: false})).toBe("league");
    });

    it("does nothing on the menu when scrolled down", () => {
        expect(keyIntent({key: "PageUp", view: "menu", scrollY: 800, targetIsInteractive: false})).toBeNull();
    });

    it("returns to menu with PageDown and ArrowDown in league", () => {
        expect(keyIntent({key: "PageDown", view: "league", scrollY: 0, targetIsInteractive: false})).toBe("menu");
        expect(keyIntent({key: "ArrowDown", view: "league", scrollY: 0, targetIsInteractive: false})).toBe("menu");
    });

    it("leaves focused controls alone", () => {
        expect(keyIntent({key: "ArrowUp", view: "menu", scrollY: 0, targetIsInteractive: true})).toBeNull();
    });
});
