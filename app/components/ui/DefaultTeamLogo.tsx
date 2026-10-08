import Image from "next/image";
import {cn} from "@/lib/utils";
import {getLogoClassName} from "@/app/lib/logoClass";

export function DefaultTeamLogo({sizes, alt = "", className}: {sizes: string; alt?: string; className?: string}) {
    return (
        <>
            <Image
                src="/default-team-light.png"
                alt={alt}
                fill
                sizes={sizes}
                className={cn(getLogoClassName(true), "dark:hidden", className)}
            />
            <Image
                src="/default-team-dark.png"
                alt={alt}
                fill
                sizes={sizes}
                className={cn(getLogoClassName(true), "hidden dark:block", className)}
            />
        </>
    );
}
