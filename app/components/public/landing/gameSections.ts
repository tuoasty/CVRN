import type {RepresentativePlayer} from "./representatives";

export type PlayerSide = "left" | "right";

export type SectionAction =
    | {kind: "external"; label: string; href: string}
    | {kind: "league"; label: string};

export interface SectionCaption {
    player: RepresentativePlayer;
    left: number;
    top: number;
    align: "start" | "end";
}

export interface GameSection {
    id: "game" | "league" | "community";
    heading: string;
    body: string;
    primary: SectionAction;
    secondary: {label: string; href: string} | null;
    side: PlayerSide;
    art: string | null;
    captions: SectionCaption[];
}

export const GAME_SECTIONS: GameSection[] = [
    {
        id: "game",
        heading: "6v6 volleyball, played like the real sport",
        body: "Coordinate attacks with your team and execute the plays you call.",
        primary: {kind: "external", label: "Play on Roblox", href: "https://www.roblox.com/games/79010415692181/CVR-Retro"},
        secondary: {label: "Game information", href: "/information"},
        side: "left",
        art: null,
        captions: [],
    },
    {
        id: "league",
        heading: "Three regions, one title each",
        body: "Players across Asia, Europe and America compete for their region's title. Climb from the qualifiers to the playoffs, win Robux and even in-game specs on the way.",
        primary: {kind: "league", label: "View the league"},
        secondary: null,
        side: "right",
        art: null,
        captions: [],
    },
    {
        id: "community",
        heading: "Join the community",
        body: "Connect with other CVR: Retro players, or find a team that suits you and compete in the league.",
        primary: {kind: "external", label: "Join the Discord", href: "https://discord.gg/bXtNACsuWF"},
        secondary: null,
        side: "left",
        art: null,
        captions: [],
    },
];
