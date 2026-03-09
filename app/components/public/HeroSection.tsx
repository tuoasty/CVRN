import HeroSlideshow from "./HeroSlideshow";

export default function HeroSection() {
    return (
        <section className="relative h-screen w-full">
            <HeroSlideshow />
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10 animate-bounce">
                <div className="w-px h-6 bg-gradient-to-b from-foreground/30 to-transparent" />
            </div>
        </section>
    );
}