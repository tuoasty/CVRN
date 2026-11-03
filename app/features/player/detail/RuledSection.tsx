import type {ReactNode} from "react";
import Link from "next/link";

export function RuledSection({title, action, id, children}: {title: string; action?: ReactNode; id?: string; children: ReactNode}) {
    return (
        <section id={id} className="min-w-0 scroll-mt-20">
            <div className="flex items-baseline justify-between gap-4">
                <h2 className="text-sm font-semibold text-foreground">{title}</h2>
                {action}
            </div>
            <div className="mt-2 border-t border-border">{children}</div>
        </section>
    );
}

export function SectionLink({href, children}: {href: string; children: ReactNode}) {
    return (
        <Link href={href} prefetch={false} className="shrink-0 text-xs font-medium text-primary hover:underline">
            {children}
        </Link>
    );
}
