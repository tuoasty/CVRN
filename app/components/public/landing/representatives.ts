import type {PlayerRawStatTotalsRow} from "@/server/domains/player/types";

export const ART = {w: 3840, h: 2160} as const;

export const ART_TIERS = [1920, 2560, 3840] as const;

export type RepresentativeRegion = "eu" | "as" | "na";

export interface LandingAward {
    count: number;
    label: string;
}

export interface LandingStat {
    key: keyof PlayerRawStatTotalsRow;
    label: string;
    placeholder: number;
}

export interface Representative {
    region: RepresentativeRegion;
    code: string;
    name: string;
    column: number;
    z: number;
    box: {x: number; y: number; w: number; h: number};
    info: {left: number; top: number};
    username: string;
    displayName: string;
    awards: LandingAward[];
    stats: LandingStat[];
}

export const REPRESENTATIVES: Representative[] = [
    {
        region: "eu",
        code: "EU",
        name: "Europe",
        column: 0,
        z: 3,
        box: {x: 1, y: 214, w: 1822, h: 1898},
        info: {left: 66, top: 31},
        username: "nickey",
        displayName: "Nickey",
        awards: [
            {count: 2, label: "League MVP"},
            {count: 2, label: "Champion"},
            {count: 3, label: "First Team"},
        ],
        stats: [
            {key: "ape_kills", label: "Kills", placeholder: 412},
            {key: "jump_serve_aces", label: "Aces", placeholder: 58},
            {key: "kill_blocks", label: "Blocks", placeholder: 91},
            {key: "sets_played", label: "Sets", placeholder: 64},
        ],
    },
    {
        region: "as",
        code: "AS",
        name: "Asia",
        column: 1,
        z: 1,
        box: {x: 1657, y: 793, w: 813, h: 1364},
        info: {left: 68, top: 30},
        username: "keny",
        displayName: "Keny",
        awards: [
            {count: 2, label: "League MVP"},
            {count: 1, label: "Champion"},
            {count: 2, label: "First Team"},
        ],
        stats: [
            {key: "assists", label: "Assists", placeholder: 903},
            {key: "float_aces", label: "Aces", placeholder: 47},
            {key: "digs", label: "Digs", placeholder: 210},
            {key: "sets_played", label: "Sets", placeholder: 61},
        ],
    },
    {
        region: "na",
        code: "NA",
        name: "Americas",
        column: 2,
        z: 2,
        box: {x: 2437, y: 828, w: 1400, h: 1331},
        info: {left: 6, top: 26},
        username: "jonn",
        displayName: "Jonn",
        awards: [
            {count: 2, label: "League MVP"},
            {count: 2, label: "Champion"},
            {count: 1, label: "Best Blocker"},
        ],
        stats: [
            {key: "ape_kills", label: "Kills", placeholder: 356},
            {key: "kill_blocks", label: "Blocks", placeholder: 142},
            {key: "jump_serve_aces", label: "Aces", placeholder: 33},
            {key: "sets_played", label: "Sets", placeholder: 58},
        ],
    },
];

export function artSrc(name: string, tier: number) {
    return `/landing/${name}-${tier}.webp`;
}

export function artSrcSet(name: string, naturalWidth: number) {
    return ART_TIERS.map(t => `${artSrc(name, t)} ${Math.round(naturalWidth * t / ART.w)}w`).join(", ");
}
