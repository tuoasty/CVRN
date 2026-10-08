import {buildPublicMatchHref, buildPublicPlayerHref, buildPublicTeamHref} from "@/app/utils/matchDetailHref";
import {roundLabelLong, roundLabelShort} from "@/app/utils/playoffRounds";
import type {RecordEntry} from "@/server/domains/record";

export type RecordContextPiece =
    | {
          kind: "match";
          opponent: string | null;
          round: string;
          detail: "set" | "sets";
          count: number;
          title: string | null;
          href: string | null;
      }
    | {kind: "scope"; regionCode: string; seasonNumber: number | null}
    | {kind: "tally"; count: number; unit: "M" | "S"}
    | {kind: "inProgress"};

export function recordTeamHref(entry: RecordEntry, teamSlug: string | null | undefined): string | null {
    return buildPublicTeamHref({regionCode: entry.regionCode, seasonSlug: entry.season.slug, teamSlug});
}

export function recordContext(entry: RecordEntry): RecordContextPiece[] {
    const scope: RecordContextPiece = {kind: "scope", regionCode: entry.regionCode, seasonNumber: entry.season.number};

    if (entry.grain === "season") {
        const pieces: RecordContextPiece[] = [
            scope,
            {kind: "tally", count: entry.matchesPlayed, unit: "M"},
            {kind: "tally", count: entry.setsPlayed, unit: "S"},
        ];
        if (entry.season.active) pieces.push({kind: "inProgress"});
        return pieces;
    }

    const pieces: RecordContextPiece[] = [];
    if (entry.match) {
        const {round, code} = entry.match;
        pieces.push({
            kind: "match",
            opponent: entry.opponent?.name ?? null,
            round: round ? roundLabelShort(round) : (code ?? ""),
            detail: entry.grain === "set" ? "set" : "sets",
            count: entry.grain === "set" ? (entry.setNumber ?? 0) : entry.setsPlayed,
            title: round ? roundLabelLong(round) : null,
            href: buildPublicMatchHref({
                matchCode: code,
                homeTeamName: entry.team?.name,
                awayTeamName: entry.opponent?.name,
                regionCode: entry.regionCode,
                seasonSlug: entry.season.slug,
            }),
        });
    }
    pieces.push(scope);
    return pieces;
}

export function recordEntryName(entry: RecordEntry): string {
    if (entry.subject === "team") return entry.team?.name ?? "Unknown team";
    return entry.player?.displayName || entry.player?.username || "Unknown player";
}

export function recordEntryHref(entry: RecordEntry): string | null {
    if (entry.subject === "team") return recordTeamHref(entry, entry.team?.slug);
    return buildPublicPlayerHref(entry.player?.username);
}
