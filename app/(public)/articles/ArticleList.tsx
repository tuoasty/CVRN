import Image from "next/image"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { buildArticleHref } from "@/app/utils/matchDetailHref"
import { cn } from "@/lib/utils"
import type { ArticleListItem } from "@/server/domains/article"

function formatDate(iso: string | null): string {
    if (!iso) return ""
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function ArticleListRow({ article }: { article: ArticleListItem }) {
    const href = buildArticleHref(article)
    const authorName = article.author ? article.author.display_name || article.author.username : null
    const date = formatDate(article.published_at ?? article.created_at)

    return (
        <Link
            href={href}
            prefetch={false}
            className="group panel flex items-stretch gap-4 p-3 transition-[color,box-shadow,transform] duration-150 hover:border-primary hover:shadow-sm hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
            {article.thumbnail_url && (
                <div className="relative w-28 flex-none aspect-video overflow-hidden rounded-sm border border-border bg-muted sm:w-40">
                    <Image src={article.thumbnail_url} alt={article.title} fill sizes="160px" className="object-cover" unoptimized />
                </div>
            )}

            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
                <h3 className="text-base font-semibold leading-snug tracking-tight line-clamp-2">{article.title}</h3>
                {article.snippet && (
                    <p className="text-sm leading-snug text-muted-foreground line-clamp-2">{article.snippet}</p>
                )}
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {article.author?.avatar_url && (
                        <span className="relative h-[18px] w-[18px] flex-none overflow-hidden rounded-sm border border-border">
                            <Image src={article.author.avatar_url} alt="" fill sizes="18px" className="object-cover" unoptimized />
                        </span>
                    )}
                    {authorName && <span className="truncate">{authorName}</span>}
                    {authorName && <span className="text-muted-foreground/50">·</span>}
                    <span className="font-mono tabular-nums">{date}</span>
                </div>
            </div>

            <div className="flex items-center pl-1">
                <ChevronRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5" />
            </div>
        </Link>
    )
}

export default function ArticleList({ articles, columns = 1 }: { articles: ArticleListItem[]; columns?: 1 | 2 }) {
    return (
        <div className={cn("grid gap-3", columns === 2 ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
            {articles.map(article => (
                <ArticleListRow key={article.id} article={article} />
            ))}
        </div>
    )
}
