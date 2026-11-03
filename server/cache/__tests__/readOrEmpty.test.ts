import {describe, expect, it, vi} from "vitest";
import {readOrEmpty} from "../readOrEmpty";

vi.mock("@/server/utils/logger", () => ({logger: {error: vi.fn()}}));

describe("readOrEmpty", () => {
    it("returns what the read returned", async () => {
        await expect(readOrEmpty(Promise.resolve(["card"]), "cards")).resolves.toEqual(["card"]);
    });

    it("returns an empty list when the read fails, so the page can still render", async () => {
        await expect(readOrEmpty(Promise.reject(new Error("PostgREST 503")), "cards")).resolves.toEqual([]);
    });

    it("lets Next control-flow errors through", async () => {
        const dynamicBailout = Object.assign(new Error("DYNAMIC_SERVER_USAGE"), {digest: "DYNAMIC_SERVER_USAGE"});
        await expect(readOrEmpty(Promise.reject(dynamicBailout), "cards")).rejects.toBe(dynamicBailout);
    });
});
