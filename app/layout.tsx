import type {Metadata} from "next";
import {Geist} from "next/font/google";
import {ThemeProvider} from "next-themes";
import "./globals.css";
import {Toaster} from "@/app/components/ui/sonner";
import {Analytics} from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next"
import {SWRProvider} from "@/app/providers/SWRProvider";
import NextTopLoader from "nextjs-toploader";

const siteUrl = "https://cvrn.vercel.app";

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

const geistSans = Geist({
    variable: "--font-geist-sans",
    display: "swap",
    subsets: ["latin"],
    preload: false,
});

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
        <body className={`${geistSans.variable} ${geistSans.className} antialiased`}>
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
        >
            <NextTopLoader
                color="hsl(var(--primary))"
                height={3}
                showSpinner={false}
                shadow={false}
            />
            <SWRProvider>
            {children}
            </SWRProvider>
            <Toaster/>
            <Analytics/>
            {/* Off by default: Speed Insights bills per pageview and was 160% over the
                Hobby quota. Set NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS=1 to re-enable. */}
            {process.env.NEXT_PUBLIC_ENABLE_SPEED_INSIGHTS === "1" && <SpeedInsights/>}
        </ThemeProvider>
        </body>
        </html>
    );
}