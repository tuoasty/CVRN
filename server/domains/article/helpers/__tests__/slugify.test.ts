import { describe, it, expect } from "vitest";
import { slugify } from "../slugify";

describe("slugify", () => {
    it("lowercases and hyphenates", () => {
        expect(slugify("Hello World")).toBe("hello-world");
    });

    it("strips punctuation and collapses separators", () => {
        expect(slugify("CVRN: Week 3 — Recap!!!")).toBe("cvrn-week-3-recap");
    });

    it("trims leading and trailing hyphens", () => {
        expect(slugify("  ...title...  ")).toBe("title");
    });

    it("falls back to 'article' when nothing usable remains", () => {
        expect(slugify("!!!")).toBe("article");
        expect(slugify("")).toBe("article");
    });

    it("caps length at 80 characters", () => {
        expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
    });
});
