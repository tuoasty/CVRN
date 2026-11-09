import type {MatchWithDetails} from "@/server/domains/match";
import type {TeamWithRegion} from "@/server/domains/team";
import {formatRegionDate, formatRegionTime} from "@/app/(public)/home/model/format";
import {regionDayKey} from "@/app/(public)/home/model/phase";
import {roundLabelLong} from "@/app/utils/playoffRounds";
import {parseMatchNumber} from "@/app/utils/matchLabel";
import type {BuildScheduleInput, ScheduleDay, ScheduleRow, ScheduleTeam, ScheduleView} from "./types";

const UNDATED_UPCOMING = "Not scheduled yet";
const UNDATED_RESULTS = "Date unknown";

function byTimeThenCode(a: MatchWithDetails, b: MatchWithDetails): number {
    const at = a.match.scheduled_at;
    const bt = b.match.scheduled_at;
    if (at && bt && at !== bt) return at.localeCompare(bt);
    if (at && !bt) return -1;
    if (!at && bt) return 1;
    return (a.match.match_code ?? "").localeCompare(b.match.match_code ?? "", undefined, {numeric: true});
}

function toTeam(team: TeamWithRegion, tag: string | null, won: boolean): ScheduleTeam {
    return {id: team.id, name: team.name, logoUrl: team.logo_url, logoBgRemoved: team.logo_bg_removed, tag, won};
}

function formatSigned(value: number, unit: string): string {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)} ${unit}`;
}

function impactFor(m: MatchWithDetails, input: BuildScheduleInput, homeWon: boolean): string | null {
    if (input.kind !== "season" || m.match.status !== "completed") return null;
    const match = m.match;
    if (input.standingMethod === "lvr") {
        const value = homeWon ? match.home_team_lvr : match.away_team_lvr;
        return value == null ? null : formatSigned(value, "LVR");
    }
    const points = homeWon ? match.home_team_points : match.away_team_points;
    if (points == null) return null;
    const bonus = input.standingMethod === "points" ? (homeWon ? match.home_team_bonus : match.away_team_bonus) ?? 0 : 0;
    return formatSigned(points + bonus, "PTS");
}

function toRow(m: MatchWithDetails, home: TeamWithRegion, away: TeamWithRegion, input: BuildScheduleInput): ScheduleRow {
    const match = m.match;
    const isCompleted = match.status === "completed";
    const homeSets = match.home_sets_won;
    const awaySets = match.away_sets_won;
    const homeWon = isCompleted && (homeSets ?? 0) > (awaySets ?? 0);
    const awayWon = isCompleted && (awaySets ?? 0) > (homeSets ?? 0);
    const tagFor = (teamId: string): string | null => {
        if (input.kind === "playoffs") {
            const seed = input.seeds[teamId];
            return seed == null ? null : `#${seed}`;
        }
        const record = input.records.get(teamId);
        return record ? `${record.wins}-${record.losses}` : null;
    };
    const number = parseMatchNumber(match.match_code);
    const label = input.kind === "playoffs"
        ? (m.playoff_round ? roundLabelLong(m.playoff_round) : match.match_code ?? "Playoffs")
        : number != null ? `Match ${number}` : "Match";
    return {
        matchId: match.id,
        match,
        time: match.scheduled_at ? formatRegionTime(match.scheduled_at, input.timeZone) : null,
        label,
        home: toTeam(home, tagFor(home.id), homeWon),
        away: toTeam(away, tagFor(away.id), awayWon),
        isCompleted,
        homeSets,
        awaySets,
        sets: [...m.sets].sort((a, b) => a.set_number - b.set_number).map(s => ({home: s.home_score, away: s.away_score})),
        isForfeit: !!match.is_forfeit,
        impact: impactFor(m, input, homeWon),
    };
}

function group(entries: {m: MatchWithDetails; row: ScheduleRow}[], timeZone: string, todayKey: string, undatedLabel: string): ScheduleDay[] {
    const days: ScheduleDay[] = [];
    for (const {m, row} of entries) {
        const iso = m.match.scheduled_at;
        const key = iso ? regionDayKey(iso, timeZone) : "undated";
        let day = days.find(d => d.key === key);
        if (!day) {
            day = {key, label: iso ? formatRegionDate(iso, timeZone) : undatedLabel, isToday: key === todayKey, rows: []};
            days.push(day);
        }
        day.rows.push(row);
    }
    return days;
}

export function buildScheduleView(input: BuildScheduleInput): ScheduleView {
    const todayKey = regionDayKey(input.now.toISOString(), input.timeZone);
    const entries = [...input.matches].sort(byTimeThenCode).flatMap(m => {
        const home = m.match.home_team_id ? input.teams.get(m.match.home_team_id) : undefined;
        const away = m.match.away_team_id ? input.teams.get(m.match.away_team_id) : undefined;
        if (!home || !away) return [];
        return [{m, row: toRow(m, home, away, input)}];
    });
    const upcoming = group(entries.filter(e => !e.row.isCompleted), input.timeZone, todayKey, UNDATED_UPCOMING);
    const results = group(entries.filter(e => e.row.isCompleted), input.timeZone, todayKey, UNDATED_RESULTS);
    const dated = results.filter(d => d.key !== "undated").reverse();
    const undated = results.filter(d => d.key === "undated");
    return {upcoming, results: [...dated, ...undated]};
}
