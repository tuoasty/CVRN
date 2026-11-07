export interface SocialLink {
    label: string;
    href: string;
    image: string;
}

export interface SiteLink {
    label: string;
    href: string;
}

export const SOCIAL_LINKS: SocialLink[] = [
    {label: "CVR: Retro on Roblox", href: "https://www.roblox.com/games/79010415692181/CVR-Retro", image: "/socials/roblox.png"},
    {label: "Main Discord", href: "https://discord.gg/bXtNACsuWF", image: "/socials/discord-main.webp"},
    {label: "Asia Discord", href: "https://discord.gg/TyfDzSPhRz", image: "/socials/discord-asia.webp"},
];

export const LEAGUE_SHEET: SiteLink = {
    label: "League spreadsheet",
    href: "https://docs.google.com/spreadsheets/d/1gJFt-oI29EJXMD19lInXFtijXQaJxRsDBuIlf8jOSoI",
};

export const SITE_LINKS: SiteLink[] = [
    {label: "About", href: "/about"},
    {label: "Contact", href: "/about#contact"},
    {label: "Credits", href: "/about#credits"},
    {label: "Privacy Policy", href: "/privacy"},
    {label: "Terms of Service", href: "/terms"},
];
