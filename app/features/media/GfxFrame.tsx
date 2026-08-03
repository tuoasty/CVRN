import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
    src: string;
    alt: string;

    sizes: string;
    priority?: boolean;
    className?: string;
};

export default function GfxFrame({ src, alt, sizes, priority = false, className }: Props) {
    return (
        <div className={cn("relative overflow-hidden", className)}>
            {}
            <Image
                src={src}
                alt=""
                aria-hidden
                fill
                sizes="64px"
                className="object-cover scale-[1.15] blur-[28px] saturate-125 opacity-85"
            />
            {}
            <div className="absolute inset-0 bg-black/25" />
            <Image
                src={src}
                alt={alt}
                fill
                priority={priority}
                sizes={sizes}
                className="object-contain"
            />
        </div>
    );
}
