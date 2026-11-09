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
import {isPlayoffRound, roundLabelLong, roundLabelShort} from "@/app/utils/playoffRounds";
import {buildArticleHref, buildPublicMatchHref, buildPublicPlayerHref, buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import {resolveMediaThumbnail} from "@/app/features/media/mediaUtils";
import {getSeasonPhase} from "./model/phase";
import {postRatio} from "./model/ratio";
import {formatRegionTime, formatWhen} from "./model/format";
import {rankHeroCandidates, type HeroCandidate} from "./model/rankHeroCandidates";
import {buildTape, standingRating} from "./model/buildTape";
import {LEADER_ORDER, LEADER_SHORT, MATCHUP_LABELS, MATCHUP_ORDER, matchupLine, pickMatchLeader, pickTeamLeader, topSeasonLeaders} from "./model/leaders";
import {POSITION_NAMES, mainPosition, potwLine, roundTeamLeaders, sumPlayerTotals} from "./model/awardLines";
import {MEDIA_ROW_HEIGHT, THUMB_GAP, THUMB_ROW_WIDTH, fitRows, fitThumbs} from "./model/fitThumbs";
import {orderResults} from "./model/orderResults";
import {groupByRegionDay, groupUpcoming} from "./model/groupUpcoming";
import {pickVod} from "./model/pickVod";
import {buildMediaFeed} from "./model/buildMediaFeed";
import type {AwardRow, HeroImage, HeroItem, HomeTeam, HomeView, LeaderCell, LeaderColumn, MatchupCategory, MediaTile, NewsRow, ResultDay, ResultRow, StandingRow, StatCell, UpcomingDay, UpcomingRow, VodItem} from "./model/types";

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

const STAT_MATCH_WINDOW = 30;
const MEDIA_ROWS = 3;

function weekFromRoundKey(roundKey: string | null): number | null {
    const m = roundKey?.match(/^week:(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
}

function roundMatches(completed: MatchWithDetails[], roundKey: string | null): MatchWithDetails[] {
    if (!roundKey) return [];
    const week = weekFromRoundKey(roundKey);
    if (week !== null) return completed.filter(m => m.match.match_type === "season" && m.match.week === week);
    return isPlayoffRound(roundKey) ? completed.filter(m => m.playoff_round === roundKey) : [];
}

export function statMatchIdsFor(completed: MatchWithDetails[], posts: MediaPost[], seasonId: string): string[] {
    const ids = new Set(completed.slice(0, STAT_MATCH_WINDOW).map(m => m.match.id));
    const withGfx = new Set(posts.filter(p => p.type === "gfx" && p.match_id).map(p => p.match_id as string));
    for (const m of completed) {
        if (withGfx.has(m.match.id)) ids.add(m.match.id);
    }
    for (const p of posts) {
        if ((p.type === "potw" || p.type === "totw") && p.season_id === seasonId) {
            for (const m of roundMatches(completed, p.round_key)) ids.add(m.match.id);
        }
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
        return {name: p.display_name || p.username, username: p.username, avatarUrl: p.avatar_url, href: buildPublicPlayerHref(p.username)};
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
            const playerId = c.post.player_id as string;
            const person = input.people.get(playerId);
            const playerRow = input.leaderRows.find(r => r.player_id === playerId);
            const position = mainPosition(playerRow?.position_counts);
            const roundLabel = roundKeyLabel(c.post.round_key);
            const roundTotals = roundMatches(input.completed, c.post.round_key).flatMap(m => totalsByMatch.get(m.match.id) ?? []);
            const roundRow = roundLabel ? sumPlayerTotals(roundTotals, playerId) : null;
            let line: StatCell[] = [];
            let statsLabel: string | null = null;
            if (roundRow) {
                line = potwLine(position, roundRow, "match");
                statsLabel = roundLabel;
            } else if (playerRow) {
                line = potwLine(position, playerRow as unknown as Record<string, unknown>, "season");
                statsLabel = "Season, per set";
            }
            const playerHref = buildPublicPlayerHref(person?.username);
            const shownRound = roundLabel ?? c.post.description;
            return {
                kind: "potw",
                key: c.post.id,
                image: image(c.post, playerHref),
                label: shownRound ? `Player of the Week · ${shownRound}` : "Player of the Week",
                player: {
                    name: person?.name ?? c.post.title,
                    username: person?.username ?? "",
                    avatarUrl: person?.avatarUrl ?? null,
                    href: playerHref,
                },
                team: toTeam(playerRow?.team_id ?? c.post.team_id),
                position: position ? POSITION_NAMES[position] : null,
                statsLabel,
                line,
            };
        }
        if (c.kind === "totw") {
            const teamId = c.post.team_id;
            const team = toTeam(teamId);
            const standing = standingFor(teamId);
            const roundLabel = roundKeyLabel(c.post.round_key);
            const played = teamId
                ? roundMatches(input.completed, c.post.round_key).filter(m => m.match.home_team_id === teamId || m.match.away_team_id === teamId)
                : [];
            const roundTotals = played.flatMap(m => totalsByMatch.get(m.match.id) ?? []);
            const useRound = !!roundLabel && roundTotals.some(t => t.team_id === teamId);
            const roundLeaders = useRound && teamId ? roundTeamLeaders(roundTotals, teamId) : null;
            const toCell = (
                pick: { playerId: string; value: number } | null,
                row: Record<string, unknown> | undefined,
                category: MatchupCategory,
                source: "season" | "match",
            ): LeaderCell | null => {
                if (!pick) return null;
                const who = resolvePlayer(pick.playerId);
                if (!who) return null;
                return {
                    playerId: pick.playerId,
                    name: who.name,
                    username: who.username,
                    avatarUrl: who.avatarUrl,
                    href: who.href,
                    value: pick.value,
                    line: row ? matchupLine(category, row, source) : [],
                };
            };
            const leaders = teamId
                ? MATCHUP_ORDER.map(category => {
                      if (roundLeaders) {
                          const pick = roundLeaders[category];
                          return {category, label: MATCHUP_LABELS[category], cell: toCell(pick, pick?.row, category, "match")};
                      }
                      const pick = pickTeamLeader(input.leaderRows, teamId, category);
                      const row = input.leaderRows.find(r => r.player_id === pick?.playerId && r.team_id === teamId);
                      return {
                          category,
                          label: MATCHUP_LABELS[category],
                          cell: toCell(pick, row as unknown as Record<string, unknown> | undefined, category, "season"),
                      };
                  }).filter(l => l.cell !== null)
                : [];
            const shownRound = roundLabel ?? c.post.description;
            const results = useRound && teamId
                ? [...played]
                      .sort((a, b) => (a.match.scheduled_at ?? "").localeCompare(b.match.scheduled_at ?? ""))
                      .map(m => {
                          const home = m.match.home_team_id === teamId;
                          const mine = (home ? m.match.home_sets_won : m.match.away_sets_won) ?? 0;
                          const theirs = (home ? m.match.away_sets_won : m.match.home_sets_won) ?? 0;
                          const opponentId = home ? m.match.away_team_id : m.match.home_team_id;
                          return {
                              key: m.match.id,
                              result: mine > theirs ? ("W" as const) : ("L" as const),
                              opponent: (opponentId && teamById.get(opponentId)?.name) || "TBD",
                              score: `${mine}-${theirs}`,
                          };
                      })
                : [];
            return {
                kind: "totw",
                key: c.post.id,
                image: image(c.post, team?.href ?? null),
                label: shownRound ? `Team of the Week · ${shownRound}` : "Team of the Week",
                team,
                record: standing ? `${standing.wins ?? 0}-${standing.losses ?? 0}` : null,
                rank: standing?.rank ?? null,
                results,
                leaders,
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

    const roundCodeOf = (m: MatchWithDetails) =>
        m.match.match_type === "playoffs" && m.playoff_round ? roundLabelShort(m.playoff_round) : null;

    const toResultRow = (m: MatchWithDetails): ResultRow[] => {
        const home = toTeam(m.match.home_team_id);
        const away = toTeam(m.match.away_team_id);
        if (!home || !away) return [];
        const totals = totalsByMatch.get(m.match.id) ?? [];
        const leaders = LEADER_ORDER.flatMap(category => {
            const pick = pickMatchLeader(totals, null, category);
            const who = pick ? resolvePlayer(pick.playerId) : null;
            if (!pick || !who) return [];
            const cell: LeaderCell = {
                playerId: pick.playerId,
                name: who.name,
                username: who.username,
                avatarUrl: who.avatarUrl,
                href: who.href,
                value: pick.value,
                line: [],
            };
            return [{category, label: LEADER_SHORT[category], cell}];
        });
        return [{
            matchId: m.match.id,
            roundCode: roundCodeOf(m),
            home,
            away,
            homeSets: m.match.home_sets_won,
            awaySets: m.match.away_sets_won,
            leaders,
            href: matchHref(m),
        }];
    };
    const resultDays: ResultDay[] = groupByRegionDay(orderResults(input.completed, phase), timeZone, now, "Undated")
        .map(day => ({key: day.key, label: day.label, isToday: day.isToday, rows: day.matches.flatMap(toResultRow)}))
        .filter(day => day.rows.length > 0);

    const gfxMatchIds = new Set(input.posts.filter(p => p.type === "gfx" && p.match_id && p.image_url).map(p => p.match_id as string));
    const upcoming: UpcomingDay[] = groupUpcoming(input.upcoming, timeZone, now)
        .map(day => ({
            key: day.key,
            label: day.label,
            isToday: day.isToday,
            rows: day.matches.flatMap((m): UpcomingRow[] => {
                const home = toTeam(m.match.home_team_id);
                const away = toTeam(m.match.away_team_id);
                if (!home || !away) return [];
                return [{
                    matchId: m.match.id,
                    time: m.match.scheduled_at ? formatRegionTime(m.match.scheduled_at, timeZone) : null,
                    roundCode: roundCodeOf(m),
                    home,
                    away,
                    hasGfx: gfxMatchIds.has(m.match.id),
                    href: matchHref(m),
                }];
            }),
        }))
        .filter(day => day.rows.length > 0);

    const heroPostIds = new Set(hero.flatMap(h => (h.image ? [h.image.postId] : [])));
    const heroMatchIds = new Set(input.posts.filter(p => heroPostIds.has(p.id) && p.match_id).map(p => p.match_id as string));
    const picked = pickVod({phase, now, completed: input.completed, posts: input.posts, heroMatchIds});
    const vod: VodItem | null = picked && picked.post.video_url
        ? {
              postId: picked.post.id,
              videoUrl: picked.post.video_url,
              title: picked.post.title,
              caption: [
                  `${teamById.get(picked.match.match.home_team_id ?? "")?.name ?? "TBD"} ${picked.match.match.home_sets_won ?? 0}-${picked.match.match.away_sets_won ?? 0} ${teamById.get(picked.match.match.away_team_id ?? "")?.name ?? "TBD"}`,
                  getMatchTypeLabel(picked.match.match.match_type, picked.match.match.week, picked.match.playoff_round ?? null),
              ].join(" · "),
              matchHref: matchHref(picked.match),
          }
        : null;

    const cutoff = season.playoff_configs?.qualified_teams ?? null;
    const standingRows: StandingRow[] = [...input.standings]
        .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
        .slice(0, 10)
        .flatMap(s => {
            const team = toTeam(s.team_id);
            if (!team || !s.team_id || s.rank == null) return [];
            return [{
                teamId: s.team_id,
                rank: s.rank,
                team,
                record: `${s.wins ?? 0}-${s.losses ?? 0}`,
                sets: `${s.sets_won ?? 0}-${s.sets_lost ?? 0}`,
                rating: standingRating(s, standingMethod),
                belowCutoff: cutoff !== null && s.rank > cutoff,
                cutoffAfter: cutoff !== null && s.rank === cutoff,
            }];
        });

    const leaders: LeaderColumn[] = topSeasonLeaders(input.leaderRows).map(col => ({
        category: col.category,
        label: col.label,
        entries: col.entries.flatMap((e, i) => {
            const who = resolvePlayer(e.playerId);
            if (!who) return [];
            return [{
                rank: i + 1,
                cell: {playerId: e.playerId, name: who.name, username: who.username, avatarUrl: who.avatarUrl, href: who.href, value: e.value, line: []},
                teamName: e.teamId ? input.identity.teams[e.teamId]?.name ?? null : null,
            }];
        }),
    }));

    const regionCodeById = new Map(input.regions.map(r => [r.id, r.code.toUpperCase()]));
    const regionOfSeason = new Map(input.seasons.map(s => [s.id, regionCodeById.get(s.region_id) ?? null]));
    const excluded = new Set([...heroPostIds, ...(vod ? [vod.postId] : [])]);
    const feed: MediaTile[] = buildMediaFeed(input.posts, excluded, 60).flatMap(post => {
        const imageUrl = resolveMediaThumbnail(post.image_url, post.video_url);
        if (!imageUrl) return [];
        const isVideo = !post.image_url && !!post.video_url;
        return [{
            postId: post.id,
            imageUrl,
            ratio: isVideo ? 16 / 9 : postRatio(post),
            caption: post.title,
            regionCode: post.season_id ? regionOfSeason.get(post.season_id) ?? null : null,
            videoUrl: isVideo ? post.video_url : null,
        }];
    });
    const tiles = feed.slice(0, fitRows(feed.map(t => t.ratio), MEDIA_ROWS, THUMB_ROW_WIDTH, MEDIA_ROW_HEIGHT, THUMB_GAP));

    const newsDate = new Intl.DateTimeFormat("en-US", {timeZone, month: "short", day: "numeric"});
    const news: NewsRow[] = input.articles.slice(0, 3).map(a => ({
        slug: a.slug,
        title: a.title,
        snippet: a.snippet,
        coverUrl: a.thumbnail_url,
        dateLabel: newsDate.format(new Date(a.published_at ?? a.created_at)),
        href: buildArticleHref(a),
    }));

    const awards: AwardRow[] = phase === "completed"
        ? input.awards
              .filter(a => a.category === "individual_winners")
              .sort((a, b) => a.sort_order - b.sort_order)
              .map(a => {
                  const who = resolvePlayer(a.player_id);
                  const teamId = input.leaderRows.find(r => r.player_id === a.player_id)?.team_id
                      ?? input.teams.find(t => t.season_id === season.id && t.name === a.players.season_team_name)?.id
                      ?? null;
                  return {
                      key: a.id,
                      label: a.award_name,
                      playerName: who?.name ?? a.players.username,
                      username: who?.username ?? a.players.username,
                      team: toTeam(teamId),
                      avatarUrl: who?.avatarUrl ?? null,
                      href: who?.href ?? buildPublicPlayerHref(a.players.username),
                  };
              })
        : [];

    return {
        phase,
        basePath: `/${regionCode}/${seasonSlug}`,
        hero,
        results: {
            title: phase === "completed" ? "Final results" : "Results",
            days: resultDays,
            href: `/${regionCode}/${seasonSlug}/matches`,
        },
        upcoming,
        awards,
        vod,
        standings: {
            title: phase === "completed" ? "Final standings" : "Standings",
            ratingLabel: standingMethod === "lvr" ? "LVR" : "Points",
            rows: standingRows,
            href: `/${regionCode}/${seasonSlug}/standings`,
        },
        leaders,
        media: {tiles, href: `/${regionCode}/${seasonSlug}/media`},
        news,
    };
}
