import {describe, it, expect} from "vitest";
import {readFileSync} from "node:fs";
import {join} from "node:path";
import {ALL_CACHE_TAGS} from "../tags";
import {CACHE_TAG_INFO, CACHE_TAG_ORDER} from "../tagInfo";

/**
 * Derive the real blast radius by parsing the `tags:` arrays out of publicReads.ts.
 *
 * The admin cache page shows admins how many cached reads a purge clears, and that number
 * drives whether they press the button. A hand-maintained count silently drifts the moment
 * someone adds a cached read — so it is checked against the source rather than trusted.
 */
function deriveReadCounts(): Record<string, number> {
    const source = readFileSync(
        join(process.cwd(), "server", "cache", "publicReads.ts"),
        "utf8",
    );

    const readPattern = /export const (getCached\w+)\s*=\s*unstable_cache\(([\s\S]*?)\n\);/g;
    const counts: Record<string, number> = {};
    let reads = 0;

    for (const match of source.matchAll(readPattern)) {
        const [, name, body] = match;
        const tagsBlock = body.match(/tags:\s*\[([^\]]*)\]/);
        // A cached read with no tags can never be invalidated — always a bug.
        expect(tagsBlock, `${name} is registered with no cache tags`).toBeTruthy();
        reads++;
        for (const [, tag] of tagsBlock![1].matchAll(/CACHE_TAGS\.(\w+)/g)) {
            counts[tag] = (counts[tag] ?? 0) + 1;
        }
    }

    // Guards against the regex silently matching nothing after a refactor, which would
    // otherwise make every count assertion trivially pass.
    expect(reads, "parsed no cached reads from publicReads.ts — has the file format changed?")
        .toBeGreaterThan(10);

    return counts;
}

describe("cache tag info", () => {
    it("has an entry for every cache tag", () => {
        for (const tag of ALL_CACHE_TAGS) {
            expect(CACHE_TAG_INFO[tag], `missing CACHE_TAG_INFO entry for "${tag}"`).toBeDefined();
        }
    });

    it("orders every cache tag exactly once", () => {
        expect([...CACHE_TAG_ORDER].sort()).toEqual([...ALL_CACHE_TAGS].sort());
    });

    it("reports the real number of cached reads per tag", () => {
        const actual = deriveReadCounts();
        for (const tag of ALL_CACHE_TAGS) {
            expect(
                CACHE_TAG_INFO[tag].readCount,
                `CACHE_TAG_INFO["${tag}"].readCount is stale — publicReads.ts registers ${actual[tag] ?? 0}`,
            ).toBe(actual[tag] ?? 0);
        }
    });

    it("registers every tag on at least one cached read", () => {
        const actual = deriveReadCounts();
        for (const tag of ALL_CACHE_TAGS) {
            expect(actual[tag] ?? 0, `tag "${tag}" is defined but no cached read uses it`).toBeGreaterThan(0);
        }
    });
});
