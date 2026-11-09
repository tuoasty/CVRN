import Link from "next/link";
import Image from "next/image";
import {SectionHeading} from "./SectionHeading";
import type {NewsRow} from "../model/types";

export function NewsSection({rows}: {rows: NewsRow[]}) {
    if (rows.length === 0) return null;
    return (
        <section aria-label="News">
            <SectionHeading title="News" href="/articles" linkLabel="All articles" />
            <ul className="mt-4 grid gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
                {rows.map(row => (
                    <li key={row.slug} className="min-w-0">
                        <Link href={row.href} className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
                            {row.coverUrl && (
                                <span className="relative mb-3 block aspect-video w-full overflow-hidden">
                                    <Image src={row.coverUrl} alt="" fill sizes="(min-width: 1024px) 440px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                                </span>
                            )}
                            <span className="block text-base font-semibold leading-snug group-hover:underline group-hover:underline-offset-4">{row.title}</span>
                            {row.snippet && <span className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">{row.snippet}</span>}
                            <span className="mt-2 block font-mono text-[11px] text-muted-foreground">{row.dateLabel}</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
