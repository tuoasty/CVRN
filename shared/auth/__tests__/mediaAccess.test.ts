import {describe, expect, it} from "vitest";
import {allowedMediaTypes, canWriteMediaType} from "@/shared/auth/mediaAccess";

describe("allowedMediaTypes", () => {
    it("gives graphics its five types", () => {
        expect(allowedMediaTypes(["graphics"])).toEqual(["gfx", "totw", "potw", "champion", "feature"]);
    });

    it("gives media video only", () => {
        expect(allowedMediaTypes(["media"])).toEqual(["video"]);
    });

    it("unions graphics and media", () => {
        expect(allowedMediaTypes(["graphics", "media"])).toEqual(["gfx", "video", "totw", "potw", "champion", "feature"]);
    });

    it("gives admin and super_admin every type", () => {
        expect(allowedMediaTypes(["admin"])).toContain("clip");
        expect(allowedMediaTypes(["super_admin"])).toContain("clip");
    });

    it("gives other groups nothing", () => {
        expect(allowedMediaTypes(["articles"])).toEqual([]);
    });
});

describe("canWriteMediaType", () => {
    it.each([
        [["graphics"], "video", false],
        [["graphics"], "clip", false],
        [["graphics"], "gfx", true],
        [["media"], "gfx", false],
        [["media"], "video", true],
        [["admin"], "clip", true],
        [["graphics", "media"], "video", true],
    ] as const)("%j writing %s is %s", (groups, type, allowed) => {
        expect(canWriteMediaType([...groups], type)).toBe(allowed);
    });
});
