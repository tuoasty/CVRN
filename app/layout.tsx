import type {Metadata} from "next";
import {IBM_Plex_Sans, IBM_Plex_Mono} from "next/font/google";
import {ThemeProvider} from "next-themes";
import "./globals.css";
import {Toaster} from "@/app/components/ui/sonner";
import Script from "next/script";
import {SWRProvider} from "@/app/providers/SWRProvider";
import NextTopLoader from "nextjs-toploader";
import { SITE_URL } from "@/app/lib/siteUrl";

export const metadata: Metadata = {
    metadataBase: new URL(SITE_URL),
    title: {
        default: "CVRN: CVR Network, the Roblox Volleyball League",
        template: "%s · CVRN",
    },
    description:
        "CVRN (CVR Network) is the Confederate Volleyball Roblox Network. Standings, match results, teams, playoff brackets and player stats for the CVR Roblox volleyball league.",
    applicationName: "CVRN",
    openGraph: {
        title: "CVR Network",
        description: "The official CVR Network. View league information, matches, teams, and more.",
        url: SITE_URL,
        siteName: "Confederate Volleyball Roblox Network",
        images: [
            {
                url: `${SITE_URL}/embed.jpg`,
                width: 1200,
                height: 630,
                alt: "CVRN: three players under the arena lights as the ball drops",
            },
        ],
        locale: "en_US",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "CVR Network",
        description:
            "The official CVR Network. View league standings, match schedules, teams, and playoff brackets for the CVRN Volleyball League.",
        images: [`${SITE_URL}/embed.jpg`],
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
}

const plexSans = IBM_Plex_Sans({
    variable: "--font-sans",
    display: "swap",
    subsets: ["latin"],
    weight: ["400", "500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
    variable: "--font-mono",
    display: "swap",
    subsets: ["latin"],
    weight: ["400", "500", "600"],
    preload: false,
});

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${plexSans.variable} ${plexMono.variable} ${plexSans.className} antialiased`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem
        >
            <NextTopLoader
                color="hsl(var(--primary))"
                height={3}
                showSpinner={false}
                shadow={false}
                showForHashAnchor={false}
            />
            <SWRProvider>
            {children}
            </SWRProvider>
            <Toaster/>
        </ThemeProvider>
        <Script
            defer
            src="https://static.cloudflareinsights.com/beacon.min.js"
            data-cf-beacon='{"token": "cdf0f4780d604a9698ab07b2eb026a95", "spa": true}'
        />
        </body>
        </html>
    );
}