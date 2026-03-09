import HeroSlideshow from "./HeroSlideshow";

export default function HeroSection() {
    return (
        <section className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[calc(100vh-64px)]">
            <HeroSlideshow />
            <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 animate-bounce">
                <div className="w-px h-4 sm:h-6 bg-gradient-to-b from-foreground/30 to-transparent" />
            </div>
        </section>
    );
}