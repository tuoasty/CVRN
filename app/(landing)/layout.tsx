import {landingDisplay} from "./landingFonts";

export default function LandingLayout({children}: {children: React.ReactNode}) {
    return <main className={`min-h-dvh bg-background ${landingDisplay.variable}`}>{children}</main>;
}
