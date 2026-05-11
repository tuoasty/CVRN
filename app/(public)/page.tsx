import { Suspense } from "react";
import RedirectCleaner from "@/app/components/providers/RedirectCleaner";
import HeroSection from "@/app/components/public/landing/HeroSection";
import CVRNInfo from "@/app/components/public/landing/CVRNInfo";

export default function PublicHome() {
    return (
        <>
            <Suspense fallback={null}>
                <RedirectCleaner />
            </Suspense>
            <HeroSection />
            <CVRNInfo />
        </>
    );
}