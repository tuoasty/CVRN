import {describe, expect, it} from "vitest";
import {readdirSync} from "node:fs";
import {join, relative, sep} from "node:path";
import {buildOpenApiDocument} from "@/server/openapi/document";
import {
    BOOSTERS_EXAMPLE,
    CHAMPION_ARCHIVE_EXAMPLE,
    PLAYER_DETAIL_EXAMPLE,
    PLAYER_STATS_EXAMPLE,
    STAT_SUMMARY_EXAMPLE,
} from "@/server/openapi/gameApi";
import {PlayerDetailApiResponseSchema, PlayerStatsResponseSchema, RawStatSummaryResponseSchema} from "@/server/domains/player/types/schemas";
import {ChampionArchiveResponseSchema} from "@/server/domains/season/types/schemas";
import {BoosterListResponseSchema} from "@/server/domains/booster/types/schemas";
import {OPEN_PICKEMS_EXAMPLE, PLACE_PICK_BODY_EXAMPLE, PLACE_PICK_EXAMPLE} from "@/server/openapi/pickems";
import {OpenPickemsResponseSchema, PlacePickBodySchema, PlacePickResponseSchema} from "@/server/domains/pickem/types/gameSchemas";

const API_DIR = join(process.cwd(), "app", "api");
const INTERNAL_ROUTES = [/^\/api\/cron\//, /^\/api\/health$/, /^\/api\/version$/];

function routeFiles(dir: string): string[] {
    return readdirSync(dir, {withFileTypes: true}).flatMap(entry => {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) return routeFiles(full);
        return entry.name === "route.ts" ? [full] : [];
    });
}

function toApiPath(file: string): string {
    const segments = relative(API_DIR, file).split(sep).slice(0, -1);
    return "/api/" + segments.map(s => s.replace(/^\[(.+)]$/, "{$1}")).join("/");
}

describe("buildOpenApiDocument", () => {
    const doc = buildOpenApiDocument();

    it("documents every external route and nothing else", () => {
        const routes = routeFiles(API_DIR)
            .map(toApiPath)
            .filter(path => !INTERNAL_ROUTES.some(re => re.test(path)))
            .sort();
        expect(Object.keys(doc.paths).sort()).toEqual(routes);
    });

    it("gives every operation an id, security, a 200 and a 401", () => {
        const ids = new Set<string>();
        for (const [path, item] of Object.entries(doc.paths)) {
            for (const op of Object.values(item)) {
                expect(op.operationId, path).toBeTruthy();
                expect(ids.has(op.operationId), op.operationId).toBe(false);
                ids.add(op.operationId);
                expect(op.security.length, path).toBeGreaterThan(0);
                for (const requirement of op.security) {
                    for (const scheme of Object.keys(requirement)) {
                        expect(doc.components.securitySchemes[scheme], scheme).toBeDefined();
                    }
                }
                expect(op.responses["200"], path).toBeDefined();
                expect(op.responses["401"], path).toBeDefined();
            }
        }
    });

    it("declares every path parameter", () => {
        for (const [path, item] of Object.entries(doc.paths)) {
            const placeholders = [...path.matchAll(/\{(\w+)}/g)].map(m => m[1]).sort();
            for (const op of Object.values(item)) {
                const declared = (op.parameters ?? []).filter(p => p.in === "path").map(p => p.name).sort();
                expect(declared, path).toEqual(placeholders);
            }
        }
    });

    it("survives JSON serialization unchanged", () => {
        expect(JSON.parse(JSON.stringify(doc))).toEqual(doc);
    });

    it("ships examples that pass their own schemas", () => {
        expect(PlayerStatsResponseSchema.safeParse(PLAYER_STATS_EXAMPLE).success).toBe(true);
        expect(PlayerDetailApiResponseSchema.safeParse(PLAYER_DETAIL_EXAMPLE).success).toBe(true);
        expect(RawStatSummaryResponseSchema.safeParse(STAT_SUMMARY_EXAMPLE).success).toBe(true);
        expect(ChampionArchiveResponseSchema.safeParse(CHAMPION_ARCHIVE_EXAMPLE).success).toBe(true);
        expect(BoosterListResponseSchema.safeParse(BOOSTERS_EXAMPLE).success).toBe(true);
        expect(OpenPickemsResponseSchema.safeParse(OPEN_PICKEMS_EXAMPLE).success).toBe(true);
        expect(PlacePickBodySchema.safeParse(PLACE_PICK_BODY_EXAMPLE).success).toBe(true);
        expect(PlacePickResponseSchema.safeParse(PLACE_PICK_EXAMPLE).success).toBe(true);
    });
});
