import Image from "next/image";

export default function HeroSlideshow() {
    return (
        <div className="absolute inset-0 z-0">
            <Image
                src="/hero-banner.png"
                alt="CVRN Hero Banner"
                fill
                priority
                className="object-cover object-center"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/20 via-transparent to-background/80" />
            <div className="absolute inset-0 bg-gradient-to-r from-background/40 via-transparent to-background/40" />
        </div>
    );
}