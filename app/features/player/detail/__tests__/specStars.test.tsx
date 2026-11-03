import {renderToStaticMarkup} from "react-dom/server";
import {describe, expect, it} from "vitest";
import type {PlayerSpecEntry} from "@/server/domains/player";
import {AwardTitle} from "../AwardsSection";

function specItem(stars: number) {
    const spec = {id: "s", spec_name: "Ace", position: "OUT", stars, dropped: false} as PlayerSpecEntry;
    return {kind: "spec" as const, key: "spec:s", spec};
}

describe("spec star colour on award rows", () => {
    it.each([
        [5, "text-secondary"],
        [4, "text-rarity-epic"],
        [3, "text-rarity-rare"],
    ])("%i stars use %s", (stars, expected) => {
        expect(renderToStaticMarkup(<AwardTitle item={specItem(stars)} />)).toContain(expected);
    });

    it("keeps amber off anything below 5 stars", () => {
        for (const stars of [4, 3, 2]) {
            expect(renderToStaticMarkup(<AwardTitle item={specItem(stars)} />)).not.toContain("text-secondary");
        }
    });
});
