import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import {
    getCachedArticleBySlug,
    getCachedMatchDetailById,
    getCachedSeasons,
    getCachedRegions,
} from "@/server/cache/publicReads"
import { safeDecodeURIComponent } from "@/app/utils/decodeURI"
import { buildPublicPlayerHref, buildPublicMatchHref } from "@/app/utils/matchDetailHref"
import { getMatchTypeLabel, parseMatchNumber } from "@/app/utils/matchLabel"
import BackButton from "@/app/components/public/BackButton"
import ArticleBody from "@/app/(public)/articles/ArticleBody"
import MatchArticleHero from "@/app/(public)/articles/MatchArticleHero"
import MatchScoreLine from "@/app/(public)/articles/MatchScoreLine"
import ArticleMatchStrip from "@/app/(public)/articles/ArticleMatchStrip"

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

    const matchDetail = article.match_id ? await getCachedMatchDetailById(article.match_id) : null

    const seasonId = article.season_id ?? matchDetail?.match.season_id ?? null
    let seasonName: string | null = null
    let seasonSlug: string | undefined
    let regionCode: string | undefined
    if (seasonId) {
        const seasons = await getCachedSeasons()
        const season = seasons.find(s => s.id === seasonId)
        if (season) {
            seasonName = season.name
            seasonSlug = season.slug
            const regions = await getCachedRegions()
            regionCode = regions.find(r => r.id === season.region_id)?.code
        }
    }

    let hero = null
    let scoreLine = null
    let strip = null
    if (matchDetail) {
        const m = matchDetail.match
        const isCompleted = m.status === "completed"
        const roundLabel = getMatchTypeLabel(m.match_type, m.week, matchDetail.playoffRound, parseMatchNumber(m.match_code) ?? undefined)
        const matchHref = buildPublicMatchHref({
            matchCode: m.match_code,
            homeTeamName: matchDetail.homeTeam?.name,
            awayTeamName: matchDetail.awayTeam?.name,
            regionCode,
            seasonSlug,
        })
        const scoreProps = {
            homeTeam: matchDetail.homeTeam,
            awayTeam: matchDetail.awayTeam,
            homeSetsWon: m.home_sets_won ?? 0,
            awaySetsWon: m.away_sets_won ?? 0,
            isCompleted,
        }
        if (article.match_gfx_url) {
            hero = <MatchArticleHero gfxUrl={article.match_gfx_url} roundLabel={roundLabel} {...scoreProps} />
        } else {
            scoreLine = <MatchScoreLine {...scoreProps} />
        }
        strip = <ArticleMatchStrip sets={matchDetail.sets} matchHref={matchHref} vodUrl={article.match_vod_url} />
    }

    return (
        <div className="page-narrow py-6 space-y-6">
            <BackButton />

            <div className="mx-auto max-w-[720px] space-y-6">
                {hero}

            <article className="space-y-6">
                <header className="space-y-4">
                    <h1 className="text-[30px] leading-tight font-semibold tracking-tight text-foreground">{article.title}</h1>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                        {author && (
                            <span className="flex items-center gap-2">
                                {author.avatar_url && (
                                    <span className="relative h-6 w-6 flex-none overflow-hidden rounded-sm border border-border">
                                        <Image src={author.avatar_url} alt={authorName ?? ""} fill sizes="24px" className="object-cover" unoptimized />
                                    </span>
                                )}
                                {authorHref ? (
                                    <Link href={authorHref} className="font-medium text-foreground transition-colors hover:text-primary">{authorName}</Link>
                                ) : (
                                    <span className="font-medium text-foreground">{authorName}</span>
                                )}
                            </span>
                        )}
                        {author && <span className="text-muted-foreground/50">·</span>}
                        <time dateTime={article.published_at} className="font-mono tabular-nums">{formatDate(article.published_at)}</time>
                        {seasonName && (
                            <>
                                <span className="text-muted-foreground/50">·</span>
                                <span>{seasonName}</span>
                            </>
                        )}
                        {regionCode && (
                            <>
                                <span className="text-muted-foreground/50">·</span>
                                <span>{regionCode.toUpperCase()} Region</span>
                            </>
                        )}
                    </div>
                </header>

                {scoreLine}

                {strip}

                <ArticleBody body={article.body} coverUrl={article.cover_url} />
            </article>
            </div>
        </div>
    )
}
