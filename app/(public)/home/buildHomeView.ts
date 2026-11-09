import "server-only";
import type {PlayerMatchStatTotal, Region, Standing} from "@/shared/types/db";
import type {MatchWithDetails} from "@/server/domains/match";
import type {MediaPost} from "@/server/domains/media";
import type {LeaderboardIdentity, LeaderboardStatRow} from "@/server/domains/player";
import type {TeamWithRegion} from "@/server/domains/team";
import type {SeasonAwardEntryWithPlayer, SeasonPodiumEntryWithTeam, SeasonWithPlayoffConfig} from "@/server/domains/season";
import type {ArticleListItem} from "@/server/domains/article";
import {getRegionTimezone} from "@/app/utils/timezoneOptions";
import {getMatchTypeLabel} from "@/app/utils/matchLabel";
import {isPlayoffRound, roundLabelLong} from "@/app/utils/playoffRounds";
import {buildPublicMatchHref, buildPublicPlayerHref, buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import {getSeasonPhase} from "./model/phase";
import {postRatio} from "./model/ratio";
import {formatWhen} from "./model/format";
import {rankHeroCandidates, type HeroCandidate} from "./model/rankHeroCandidates";
import {buildTape} from "./model/buildTape";
import {sumStatLine} from "./model/leaders";
import {fitThumbs} from "./model/fitThumbs";
import type {HeroImage, HeroItem, HomeTeam, HomeView, StatLine} from "./model/types";

export type HomePerson = { name: string; username: string; avatarUrl: string | null };

export interface HomeInput {
    now: Date;
    region: Region;
    season: SeasonWithPlayoffConfig;
    teams: TeamWithRegion[];
    upcoming: MatchWithDetails[];
    completed: MatchWithDetails[];
    posts: MediaPost[];
    standings: Standing[];
    leaderRows: LeaderboardStatRow[];
    identity: LeaderboardIdentity;
    matchTotals: PlayerMatchStatTotal[];
    podium: SeasonPodiumEntryWithTeam[];
    awards: SeasonAwardEntryWithPlayer[];
    seasons: SeasonWithPlayoffConfig[];
    regions: Region[];
    articles: ArticleListItem[];
    people: Map<string, HomePerson>;
}

const STAT_MATCH_WINDOW = 20;

function weekFromRoundKey(roundKey: string | null): number | null {
    const m = roundKey?.match(/^week:(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
}

export function statMatchIdsFor(completed: MatchWithDetails[], posts: MediaPost[], seasonId: string): string[] {
    const weeks = new Set(
        posts
            .filter(p => p.type === "potw" && p.season_id === seasonId)
            .map(p => weekFromRoundKey(p.round_key))
            .filter((w): w is number => w !== null),
    );
    const ids = new Set(completed.slice(0, STAT_MATCH_WINDOW).map(m => m.match.id));
    const withGfx = new Set(posts.filter(p => p.type === "gfx" && p.match_id).map(p => p.match_id as string));
    for (const m of completed) {
        if (withGfx.has(m.match.id)) ids.add(m.match.id);
    }
    for (const m of completed) {
        if (m.match.week !== null && weeks.has(m.match.week) && m.match.match_type === "season") ids.add(m.match.id);
    }
    return [...ids];
}

export function peopleIdsFor(posts: MediaPost[], seasonId: string): string[] {
    const recent = [...posts].sort((a, b) => b.published_at.localeCompare(a.published_at)).slice(0, 30);
    const ids = new Set<string>();
    for (const p of [...posts.filter(p => p.season_id === seasonId), ...recent]) {
        if (p.author_id) ids.add(p.author_id);
        if (p.player_id) ids.add(p.player_id);
    }
    return [...ids];
}

function roundKeyLabel(roundKey: string | null): string | null {
    const week = weekFromRoundKey(roundKey);
    if (week !== null) return `Week ${week}`;
    return roundKey && isPlayoffRound(roundKey) ? roundLabelLong(roundKey) : null;
}

export function buildHomeView(input: HomeInput): HomeView {
    const {season, region, now} = input;
    const regionCode = region.code.toLowerCase();
    const seasonSlug = season.slug;
    const timeZone = getRegionTimezone(regionCode);
    const phase = getSeasonPhase(season, now);
    const standingMethod = region.standing_method ?? "lvr";

    const teamById = new Map(input.teams.map(t => [t.id, t]));
    const toTeam = (teamId: string | null | undefined): HomeTeam | null => {
        if (!teamId) return null;
        const t = teamById.get(teamId);
        if (!t) return null;
        return {
            id: t.id,
            name: t.name,
            logoUrl: t.logo_url,
            logoBgRemoved: t.logo_bg_removed,
            href: buildPublicTeamHref({regionCode, seasonSlug, teamSlug: t.slug}),
        };
    };
    const matchHref = (m: MatchWithDetails) =>
        buildPublicMatchHref({
            matchCode: m.match.match_code,
            homeTeamName: teamById.get(m.match.home_team_id ?? "")?.name,
            awayTeamName: teamById.get(m.match.away_team_id ?? "")?.name,
            regionCode,
            seasonSlug,
        });
    const resolvePlayer = (playerId: string) => {
        const p = input.identity.players[playerId];
        if (!p) return null;
        return {name: p.display_name || p.username, avatarUrl: p.avatar_url, href: buildPublicPlayerHref(p.username)};
    };
    const totalsByMatch = new Map<string, PlayerMatchStatTotal[]>();
    for (const t of input.matchTotals) {
        if (!t.match_id) continue;
        const list = totalsByMatch.get(t.match_id) ?? [];
        list.push(t);
        totalsByMatch.set(t.match_id, list);
    }
    const image = (post: MediaPost, href: string | null): HeroImage => ({
        postId: post.id,
        imageUrl: post.image_url ?? "",
        ratio: postRatio(post),
        authorName: post.author_id ? input.people.get(post.author_id)?.name ?? null : null,
        href,
    });
    const standingFor = (teamId: string | null | undefined) => input.standings.find(s => s.team_id === teamId) ?? null;

    const championTeamId = input.podium.find(p => p.place === 1)?.team_id ?? null;
    const candidates = rankHeroCandidates({
        phase,
        now,
        timeZone,
        seasonId: season.id,
        upcoming: input.upcoming,
        completed: input.completed,
        posts: input.posts,
        championTeamId,
    });

    const toHero = (c: HeroCandidate): HeroItem | null => {
        if (c.kind === "match") {
            const m = c.match;
            const home = toTeam(m.match.home_team_id);
            const away = toTeam(m.match.away_team_id);
            if (!home || !away) return null;
            const isFinal = m.match.status === "completed";
            const when = formatWhen(m.match.scheduled_at, timeZone, now);
            const href = matchHref(m);
            return {
                kind: "match",
                key: c.post.id,
                image: image(c.post, href),
                label: getMatchTypeLabel(m.match.match_type, m.match.week, m.playoff_round ?? null),
                whenLabel: isFinal ? "Final" : when.label,
                isToday: !isFinal && when.isToday,
                isFinal,
                hasStats: (totalsByMatch.get(m.match.id)?.length ?? 0) > 0,
                home,
                away,
                homeSets: m.match.home_sets_won,
                awaySets: m.match.away_sets_won,
                setScores: [...m.sets]
                    .sort((a, b) => a.set_number - b.set_number)
                    .map(s => ({home: s.home_score, away: s.away_score})),
                tape: buildTape({
                    homeTeamId: home.id,
                    awayTeamId: away.id,
                    standings: input.standings,
                    standingMethod,
                    completed: input.completed.filter(x => x.match.id !== m.match.id),
                    leaderRows: input.leaderRows,
                    matchTotals: isFinal ? totalsByMatch.get(m.match.id) ?? [] : null,
                    before: m.match.scheduled_at,
                    resolvePlayer,
                    teamName: id => teamById.get(id)?.name ?? null,
                }),
                href,
            };
        }
        if (c.kind === "potw") {
            const person = c.post.player_id ? input.people.get(c.post.player_id) : undefined;
            const playerRow = input.leaderRows.find(r => r.player_id === c.post.player_id);
            const week = weekFromRoundKey(c.post.round_key);
            let line: StatLine | null = null;
            if (c.post.player_id && week !== null) {
                const weekTotals = input.completed
                    .filter(m => m.match.week === week && m.match.match_type === "season")
                    .flatMap(m => totalsByMatch.get(m.match.id) ?? []);
                line = sumStatLine(weekTotals, c.post.player_id);
            }
            if (!line && playerRow) {
                line = {
                    points: Math.round((playerRow.points_per_set ?? 0) * 10) / 10,
                    assists: Math.round((playerRow.assists_per_set ?? 0) * 10) / 10,
                    blocks: Math.round((playerRow.blocks_per_set ?? 0) * 10) / 10,
                    receives: Math.round((playerRow.receives_per_set ?? 0) * 10) / 10,
                    perSet: true,
                };
            }
            const playerHref = buildPublicPlayerHref(person?.username);
            const roundLabel = roundKeyLabel(c.post.round_key);
            return {
                kind: "potw",
                key: c.post.id,
                image: image(c.post, playerHref),
                label: roundLabel ? `Player of the Week · ${roundLabel}` : "Player of the Week",
                player: {
                    name: person?.name ?? c.post.title,
                    username: person?.username ?? "",
                    avatarUrl: person?.avatarUrl ?? null,
                    href: playerHref,
                },
                team: toTeam(playerRow?.team_id ?? c.post.team_id),
                line,
            };
        }
        if (c.kind === "totw") {
            const team = toTeam(c.post.team_id);
            const standing = standingFor(c.post.team_id);
            const roundLabel = roundKeyLabel(c.post.round_key);
            return {
                kind: "totw",
                key: c.post.id,
                image: image(c.post, team?.href ?? null),
                label: roundLabel ? `Team of the Week · ${roundLabel}` : "Team of the Week",
                team,
                record: standing ? `${standing.wins ?? 0}-${standing.losses ?? 0}` : null,
                rank: standing?.rank ?? null,
            };
        }
        const champion = toTeam(championTeamId);
        if (!champion) return null;
        const archiveHref = `/${regionCode}/${seasonSlug}/archive`;
        const final = input.completed.find(
            m => m.playoff_round === "grand_final" && (m.match.home_team_id === champion.id || m.match.away_team_id === champion.id),
        );
        const opponent = final ? toTeam(final.match.home_team_id === champion.id ? final.match.away_team_id : final.match.home_team_id) : null;
        return {
            kind: "champion",
            key: c.post?.id ?? "champion",
            image: c.post ? image(c.post, archiveHref) : null,
            champion,
            final: final && opponent
                ? {
                      opponent,
                      championSets: final.match.home_team_id === champion.id ? final.match.home_sets_won ?? 0 : final.match.away_sets_won ?? 0,
                      opponentSets: final.match.home_team_id === champion.id ? final.match.away_sets_won ?? 0 : final.match.home_sets_won ?? 0,
                  }
                : null,
            podium: input.podium
                .filter(p => p.place === 2 || p.place === 3)
                .sort((a, b) => a.place - b.place)
                .flatMap(p => {
                    const team = toTeam(p.team_id);
                    return team ? [{place: p.place, team}] : [];
                }),
            href: archiveHref,
        };
    };

    const allHero = candidates.map(toHero).filter((h): h is HeroItem => h !== null);
    const hero = allHero.slice(0, fitThumbs(allHero.map(h => h.image?.ratio ?? 1)));

    return {
        phase,
        hero,
        results: {title: phase === "completed" ? "Final results" : "Results", rows: [], defaultExpandedId: null},
        upcoming: [],
        awards: [],
        vod: null,
        standings: {
            title: phase === "completed" ? "Final standings" : "Standings",
            ratingLabel: standingMethod === "lvr" ? "LVR" : "Points",
            rows: [],
            href: null,
        },
        leaders: [],
        media: [],
        news: [],
    };
}
