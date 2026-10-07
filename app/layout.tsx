import type {Metadata} from "next";
import {IBM_Plex_Sans, IBM_Plex_Mono} from "next/font/google";
import {ThemeProvider} from "next-themes";
import "./globals.css";
import {Toaster} from "@/app/components/ui/sonner";
import Script from "next/script";
import {SWRProvider} from "@/app/providers/SWRProvider";
import NextTopLoader from "nextjs-toploader";

const siteUrl = process.env.SITE_URL ?? "https://cvrn.net";

export const metadata: Metadata = {
    metadataBase: new URL(siteUrl),
    title: "CVR Network – Matches, Teams, and League Info",
    description:
        "The official CVR Network. View league standings, match schedules, teams, and playoff brackets for the CVRN Volleyball League.",
    openGraph: {
        title: "CVR Network",
        description: "The official CVR Network. View league information, matches, teams, and more.",
        url: siteUrl,
        siteName: "Confederate Volleyball Roblox Network",
        images: [
            {
                url: `${siteUrl}/hero-banner-embed.png`,
                width: 1200,
                height: 630,
                alt: "CVRN - The official CVR Network",
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
        images: [`${siteUrl}/hero-banner.png`],
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