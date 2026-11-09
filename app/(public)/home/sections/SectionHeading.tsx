import Link from "next/link";
import type {ReactNode} from "react";

export function SectionHeading({title, href, linkLabel, children}: {title: string; href?: string | null; linkLabel?: string; children?: ReactNode}) {
    return (
        <div className="flex min-h-9 items-end justify-between gap-4 border-b border-border pb-2">
            <h2 className="text-base font-semibold">{title}</h2>
            {children ??
                (href && linkLabel ? (
                    <Link href={href} className="text-xs font-semibold underline underline-offset-4 hover:decoration-2">
                        {linkLabel}
                    </Link>
                ) : null)}
        </div>
    );
}
