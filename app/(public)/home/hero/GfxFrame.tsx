import Image from "next/image";
import Link from "next/link";
import {cn} from "@/lib/utils";
import type {HeroImage} from "../model/types";

export const PORTRAIT_MAX_RATIO = 1.2;
export const HERO_ROW_HEIGHT = "lg:h-[min(600px,calc((min(100vw,1440px)_-_64px)_*_0.3375))]";

export function GfxFrame({image, priority, className}: {image: HeroImage; priority?: boolean; className?: string}) {
    const art = (
        <Image src={image.imageUrl} alt="" fill priority={priority} sizes="(max-width: 1024px) 100vw, 860px" className="object-contain" />
    );
    return (
        <div
            className={cn("relative w-full shrink-0 lg:h-full lg:w-auto lg:max-w-[60%]", className)}
            style={{aspectRatio: image.ratio}}
        >
            {image.href ? (
                <Link
                    href={image.href}
                    aria-label="Open"
                    className="absolute inset-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
                >
                    {art}
                </Link>
            ) : art}
        </div>
    );
}
