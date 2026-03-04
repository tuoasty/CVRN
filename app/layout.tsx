import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import {Toaster} from "@/app/components/ui/sonner";

const defaultUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: "CVRN",
  description: "Confederate Volleyball Roblox Network",
};

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
        {children}
          <Toaster/>
      </ThemeProvider>
      </body>
      </html>
  );
}