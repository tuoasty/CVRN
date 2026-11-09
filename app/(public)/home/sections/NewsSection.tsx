import Link from "next/link";
import {SectionHeading} from "./SectionHeading";
import type {NewsRow} from "../model/types";

export function NewsSection({rows}: {rows: NewsRow[]}) {
    if (rows.length === 0) return null;
    return (
        <section aria-label="News">
            <SectionHeading title="News" href="/articles" linkLabel="All articles" />
            <ul className="mt-2">
                {rows.map(row => (
                    <li key={row.slug} className="flex items-baseline gap-4 py-1.5">
                        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">{row.dateLabel}</span>
                        <Link href={row.href} className="min-w-0 truncate text-sm hover:underline hover:underline-offset-4">
                            {row.title}
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
