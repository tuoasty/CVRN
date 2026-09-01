import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Newspaper } from "lucide-react"
import { getCachedArticleBySlug } from "@/server/cache/publicReads"
import { safeDecodeURIComponent } from "@/app/utils/decodeURI"
import { buildPublicPlayerHref } from "@/app/utils/matchDetailHref"
import BackButton from "@/app/components/public/BackButton"
import ArticleBody from "@/app/(public)/articles/ArticleBody"
import ArticleMatchMedia from "@/app/(public)/articles/ArticleMatchMedia"

type Props = {
    params: Promise<{ date: string; slug: string }>
}

export async function generateStaticParams() {
    return []
}

function formatDate(iso: string | null): string {
    if (!iso) return ""
    return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

export default async function ArticlePage({ params }: Props) {
    const { slug } = await params

    const article = await getCachedArticleBySlug(safeDecodeURIComponent(slug))
    if (!article || !article.published_at) notFound()

    const author = article.author
    const authorName = author ? author.display_name || author.username : null
    const authorHref = author ? buildPublicPlayerHref(author.username) : null

    return (
        <div className="page-narrow py-6 space-y-6">
            <BackButton />

            <article className="space-y-6">
                <header className="space-y-4">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
                        <Newspaper className="h-3.5 w-3.5" />
                        News
                    </div>
                    <h1 className="text-2xl font-semibold tracking-tight text-foreground">{article.title}</h1>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {author && (
                            <div className="flex items-center gap-2">
                                {author.avatar_url ? (
                                    <div className="relative w-6 h-6 rounded-sm overflow-hidden border border-border flex-shrink-0">
                                        <Image src={author.avatar_url} alt={authorName ?? ""} fill sizes="24px" className="object-cover" unoptimized />
                                    </div>
                                ) : null}
                                {authorHref ? (
                                    <Link href={authorHref} className="font-medium text-foreground hover:text-primary transition-colors">
                                        {authorName}
                                    </Link>
                                ) : (
                                    <span className="font-medium text-foreground">{authorName}</span>
                                )}
                            </div>
                        )}
                        {author && <span className="text-muted-foreground/40">·</span>}
                        <time dateTime={article.published_at}>{formatDate(article.published_at)}</time>
                    </div>
                </header>

                {article.cover_url && (
                    <div className="relative aspect-video w-full rounded-sm overflow-hidden border border-border bg-muted">
                        <Image src={article.cover_url} alt={article.title} fill sizes="(max-width: 1280px) 100vw, 1024px" className="object-cover" priority unoptimized />
                    </div>
                )}

                <ArticleBody body={article.body} />

                <ArticleMatchMedia title={article.title} gfxUrl={article.match_gfx_url} vodUrl={article.match_vod_url} />
            </article>
        </div>
    )
}
