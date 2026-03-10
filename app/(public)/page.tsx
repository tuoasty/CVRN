import { Suspense } from "react";
import RedirectCleaner from "@/app/components/providers/RedirectCleaner";
import HeroSection from "@/app/components/public/landing/HeroSection";
import CVRNInfo from "@/app/components/public/landing/CVRNInfo";
import PublicFooter from "@/app/components/public/landing/PublicFooter";

export default function PublicHome() {
    return (
        <>
            <Suspense fallback={null}>
                <RedirectCleaner />
            </Suspense>
            <main className="min-h-screen bg-background text-foreground flex flex-col">
                <HeroSection />
                <CVRNInfo />
                <PublicFooter />
            </main>
        </>
    );
}