import { describe, it, expect } from "vitest";
import { buildSnippet } from "../snippet";

describe("buildSnippet", () => {
    it("strips markdown emphasis, headers, and links", () => {
        const body = "# Title\n\nThis is **bold** and *italic* with a [link](https://x.com).";
        expect(buildSnippet(body)).toBe("Title This is bold and italic with a link.");
    });

    it("removes code fences and images", () => {
        const body = "Intro ```js\nconst a = 1\n``` ![alt](img.png) done";
        expect(buildSnippet(body)).toBe("Intro done");
    });

    it("truncates long text with an ellipsis", () => {
        const body = "word ".repeat(100);
        const snippet = buildSnippet(body, 20);
        expect(snippet.endsWith("…")).toBe(true);
        expect(snippet.length).toBeLessThanOrEqual(21);
    });

    it("leaves short plain text unchanged", () => {
        expect(buildSnippet("Short and clean.")).toBe("Short and clean.");
    });
});
