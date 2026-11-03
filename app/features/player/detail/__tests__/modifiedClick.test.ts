import {describe, expect, it} from "vitest";
import {isPlainLeftClick} from "../careerBack";

const plain = {button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false};

describe("isPlainLeftClick", () => {
    it("is true for an unmodified left click", () => {
        expect(isPlainLeftClick(plain)).toBe(true);
    });

    it.each([
        ["ctrl", {...plain, ctrlKey: true}],
        ["cmd", {...plain, metaKey: true}],
        ["shift", {...plain, shiftKey: true}],
        ["alt", {...plain, altKey: true}],
        ["middle button", {...plain, button: 1}],
    ])("is false for %s, so the browser can open a new tab", (_name, event) => {
        expect(isPlainLeftClick(event)).toBe(false);
    });
});
