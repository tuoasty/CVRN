"use client"

import Image from "next/image"
import Link from "next/link"
import { Newspaper } from "lucide-react"
import { buildArticleHref } from "@/app/utils/matchDetailHref"
import { cn } from "@/lib/utils"
import type { ArticleListItem } from "@/server/domains/article"

function formatDate(iso: string | null): string {
    if (!iso) return ""
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

export default function ArticleCard({ article, compact = false }: { article: ArticleListItem; compact?: boolean }) {
    const href = buildArticleHref(article)
    const authorName = article.author ? article.author.display_name || article.author.username : null
    const date = formatDate(article.published_at ?? article.created_at)

    if (compact) {
        return (
            <Link href={href} className="panel overflow-hidden flex items-center gap-3 p-2 transition-colors hover:border-primary/30">
                <div className="relative w-16 h-12 flex-shrink-0 rounded-sm overflow-hidden border border-border bg-muted">
                    {article.thumbnail_url ? (
                        <Image src={article.thumbnail_url} alt={article.title} fill sizes="64px" className="object-cover" unoptimized />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Newspaper className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{article.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{date}</p>
                </div>
            </Link>
        )
    }

    return (
        <Link href={href} className={cn("panel overflow-hidden transition-colors hover:border-primary/30 flex flex-col")}>
            <div className="relative aspect-video bg-muted">
                {article.thumbnail_url ? (
                    <Image
                        src={article.thumbnail_url}
                        alt={article.title}
                        fill
                        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                        unoptimized
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <Newspaper className="h-6 w-6 text-muted-foreground/30" />
                    </div>
                )}
            </div>
            <div className="p-3 space-y-1 flex-1 flex flex-col">
                <p className="text-sm font-semibold leading-snug line-clamp-2">{article.title}</p>
                {article.snippet && (
                    <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{article.snippet}</p>
                )}
                <div className="flex items-center justify-between gap-2 pt-1">
                    <p className="text-xs text-muted-foreground/60 truncate">{authorName ? `by ${authorName}` : ""}</p>
                    <p className="text-xs text-muted-foreground/60 shrink-0">{date}</p>
                </div>
            </div>
        </Link>
    )
}
