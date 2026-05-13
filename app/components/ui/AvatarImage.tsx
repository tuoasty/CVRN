"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";

type Props = {
    src: string | null | undefined;
    alt: string;
    sizes: string;
    priority?: boolean;
};

export default function AvatarImage({ src, alt, sizes, priority }: Props) {
    const [errored, setErrored] = useState(false);

    if (!src || errored) {
        return (
            <div className="absolute inset-0 bg-muted flex items-center justify-center">
                <User className="h-1/2 w-1/2 text-muted-foreground" />
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            className="object-cover"
            priority={priority}
            onError={() => setErrored(true)}
        />
    );
}
