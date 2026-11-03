import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {startMemoryLog} from "../memoryLog";

describe("startMemoryLog", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it.each([[undefined], [""], ["0"], ["-5"], ["soon"]])("stays off for %s", raw => {
        const write = vi.fn();
        expect(startMemoryLog(raw, write)).toBeNull();
        vi.advanceTimersByTime(60_000);
        expect(write).not.toHaveBeenCalled();
    });

    it("logs one line per interval once on", () => {
        const write = vi.fn();
        const timer = startMemoryLog("15", write);
        const atStart = write.mock.calls.length;

        vi.advanceTimersByTime(30_000);

        expect(write.mock.calls.length).toBe(atStart + 2);
        if (timer) clearInterval(timer);
    });

    it("splits memory into rss, heap, external and array buffers in MB", () => {
        const write = vi.fn();
        const timer = startMemoryLog("15", write);

        vi.advanceTimersByTime(15_000);

        const line = String(write.mock.calls.at(-1)?.[0]);
        expect(line.startsWith("[memory] ")).toBe(true);
        const sample = JSON.parse(line.slice("[memory] ".length));
        for (const field of ["rss", "heapTotal", "heapUsed", "external", "arrayBuffers"]) {
            expect(typeof sample[field]).toBe("number");
        }
        expect(sample.rss).toBeGreaterThan(sample.heapUsed);
        if (timer) clearInterval(timer);
    });

    it("records the V8 heap limit when it starts", () => {
        const write = vi.fn();
        const timer = startMemoryLog("15", write);

        const first = JSON.parse(String(write.mock.calls[0][0]).slice("[memory] ".length));
        expect(first.heapLimit).toBeGreaterThan(0);
        if (timer) clearInterval(timer);
    });
});
