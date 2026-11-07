export const ART = {w: 3840, h: 2160} as const;

export const ART_TIERS = [1920, 2560, 3840] as const;

export type RepresentativeRegion = "eu" | "as" | "na";

export type RepresentativeStatKey = "pts" | "ptsPerSet" | "hitPct" | "rec" | "ast" | "setPct" | "ace";

export type AwardRule = {label: string; category: "champion_roster"} | {label: string; awardName: string};

export interface RepresentativePlayer {
    username: string;
    displayNameOverride: string | null;
    position: string;
    stats: RepresentativeStatKey[];
    awards: AwardRule[];
}

export interface Representative {
    region: RepresentativeRegion;
    player: RepresentativePlayer;
    code: string;
    name: string;
    column: number;
    z: number;
    box: {x: number; y: number; w: number; h: number};
    info: {left: number; top: number};
}

export const REPRESENTATIVES: Representative[] = [
    {
        region: "eu",
        player: {
            username: "chrathniaggedio",
            displayNameOverride: null,
            position: "Setter",
            stats: ["ast", "setPct", "pts", "ace"],
            awards: [
                {label: "Champion", category: "champion_roster"},
                {label: "Most Valuable Player", awardName: "Most Valuable Player"},
                {label: "Best Setter", awardName: "Best Setter"},
            ],
        },
        code: "EU",
        name: "Europe",
        column: 0,
        z: 3,
        box: {x: 1, y: 214, w: 1822, h: 1898},
        info: {left: 66, top: 31},
    },
    {
        region: "as",
        player: {
            username: "EAEAEAEAEAEAEA22",
            displayNameOverride: "KenyMighto",
            position: "Opposite",
            stats: ["pts", "ptsPerSet", "hitPct", "rec"],
            awards: [
                {label: "Champion", category: "champion_roster"},
                {label: "Most Valuable Player", awardName: "Most Valuable Player"},
                {label: "Best Opposite", awardName: "Best Opposite Hitter"},
            ],
        },
        code: "AS",
        name: "Asia",
        column: 1,
        z: 1,
        box: {x: 1657, y: 793, w: 813, h: 1364},
        info: {left: 6, top: 26},
    },
    {
        region: "na",
        player: {
            username: "jonntaro",
            displayNameOverride: "jonntaro",
            position: "Opposite",
            stats: ["pts", "ptsPerSet", "hitPct", "rec"],
            awards: [
                {label: "Champion", category: "champion_roster"},
                {label: "Most Valuable Player", awardName: "Most Valuable Player"},
                {label: "Finals MVP", awardName: "Finals MVP"},
            ],
        },
        code: "NA",
        name: "Americas",
        column: 2,
        z: 2,
        box: {x: 2437, y: 828, w: 1400, h: 1331},
        info: {left: 6, top: 26},
    },
];

export function artSrc(name: string, tier: number) {
    return `/landing/${name}-${tier}.webp`;
}

export function artSrcSet(name: string, naturalWidth: number) {
    return ART_TIERS.map(t => `${artSrc(name, t)} ${Math.round(naturalWidth * t / ART.w)}w`).join(", ");
}
