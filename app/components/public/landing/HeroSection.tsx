import HeroSlideshow from "./HeroSlideshow";

export default function HeroSection() {
    return (
        <section className="relative w-full h-[50vh] sm:h-[60vh] md:h-[70vh] lg:h-[calc(100vh-64px)]">
            <HeroSlideshow />
        </section>
    );
}