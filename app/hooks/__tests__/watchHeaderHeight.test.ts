import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {watchHeaderHeight} from "../watchHeaderHeight";

const header = (height: number) => ({getBoundingClientRect: () => ({height})}) as unknown as Element;

class FakeResizeObserver {
    static last: FakeResizeObserver;
    observed = new Set<Element>();
    constructor(public fire: () => void) {
        FakeResizeObserver.last = this;
    }
    observe(element: Element) {
        this.observed.add(element);
    }
    unobserve(element: Element) {
        this.observed.delete(element);
    }
    disconnect() {
        this.observed.clear();
    }
}

describe("watchHeaderHeight", () => {
    beforeEach(() => vi.stubGlobal("ResizeObserver", FakeResizeObserver));
    afterEach(() => vi.unstubAllGlobals());

    it("reports the height of the header it finds", () => {
        const onHeight = vi.fn();
        watchHeaderHeight(() => header(56), onHeight);
        expect(onHeight).toHaveBeenLastCalledWith(56);
    });

    it("moves to the real navbar when the Suspense placeholder is swapped out", () => {
        const placeholder = header(104);
        const navbar = header(56);
        let current = placeholder;
        const onHeight = vi.fn();

        watchHeaderHeight(() => current, onHeight);
        expect(onHeight).toHaveBeenLastCalledWith(104);

        current = navbar;
        FakeResizeObserver.last.fire();

        expect(onHeight).toHaveBeenLastCalledWith(56);
        expect([...FakeResizeObserver.last.observed]).toEqual([navbar]);
    });

    it("reports 0 when there is no header", () => {
        const onHeight = vi.fn();
        watchHeaderHeight(() => null, onHeight);
        expect(onHeight).toHaveBeenLastCalledWith(0);
    });

    it("stops observing when cleaned up", () => {
        const stop = watchHeaderHeight(() => header(56), vi.fn());
        stop();
        expect(FakeResizeObserver.last.observed.size).toBe(0);
    });
});
