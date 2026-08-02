import {PlayerSeasonStatRow} from "@/shared/types/db";

export type SpecStatFormat = "count" | "per_set" | "pct";

export type SpecStatKeyMeta = {
    key: keyof PlayerSeasonStatRow;
    /** Full name, for pickers and tooltips. */
    label: string;
    /** Column-header abbreviation. Matches the public leaderboard's vocabulary. */
    short: string;
    group: string;
    format: SpecStatFormat;
};

/**
 * The stats a spec requirement may threshold.
 *
 * A deliberate subset of v_player_season_stats, not the whole view. Requirements
 * are a league rulebook read by humans — "40 kills, 30% hitting" — so the list
 * stays to stats a player could recognise as a goal. The per-set variants of
 * every error column, `misc_errors`, and the raw attempt counts are all real
 * columns and all excluded on that basis.
 *
 * Lives in the domain rather than alongside playerStatColumnMeta.ts because the
 * Zod schema validating requirement writes needs it, and a server schema
 * importing from app/features/ is backwards.
 */
export const SPEC_STAT_KEYS: SpecStatKeyMeta[] = [
    {key: "sets_played",         label: "Sets played",        short: "SP",     group: "Season",  format: "count"},
    {key: "matches_played",      label: "Matches played",     short: "MP",     group: "Season",  format: "count"},
    {key: "points_total",        label: "Points",             short: "PTS",    group: "Season",  format: "count"},
    {key: "points_per_set",      label: "Points / set",       short: "PTS/S",  group: "Season",  format: "per_set"},

    {key: "kills_total",         label: "Kills",              short: "K",      group: "Spiking", format: "count"},
    {key: "kills_per_set",       label: "Kills / set",        short: "K/S",    group: "Spiking", format: "per_set"},
    {key: "hit_eff",             label: "Hitting efficiency", short: "HIT%",   group: "Spiking", format: "pct"},
    {key: "ape_kills_total",     label: "Ape kills",          short: "APK",    group: "Spiking", format: "count"},
    {key: "ape_kills_per_set",   label: "Ape kills / set",    short: "APK/S",  group: "Spiking", format: "per_set"},
    {key: "delay_kills_total",   label: "Delay kills",        short: "DLK",    group: "Spiking", format: "count"},
    {key: "delay_kills_per_set", label: "Delay kills / set",  short: "DLK/S",  group: "Spiking", format: "per_set"},
    {key: "quick_kills_total",   label: "Quick kills",        short: "QK",     group: "Spiking", format: "count"},
    {key: "quick_kills_per_set", label: "Quick kills / set",  short: "QK/S",   group: "Spiking", format: "per_set"},
    {key: "wipes_tools_total",   label: "Wipes & tools",      short: "WT",     group: "Spiking", format: "count"},
    {key: "wipes_tools_per_set", label: "Wipes & tools / set", short: "WT/S",  group: "Spiking", format: "per_set"},

    {key: "assists_total",       label: "Assists",            short: "AST",    group: "Setting", format: "count"},
    {key: "assists_per_set",     label: "Assists / set",      short: "AST/S",  group: "Setting", format: "per_set"},
    {key: "set_eff",             label: "Set efficiency",     short: "SET%",   group: "Setting", format: "pct"},

    {key: "blocks_total",        label: "Blocks",             short: "B",      group: "Blocks",  format: "count"},
    {key: "blocks_per_set",      label: "Blocks / set",       short: "B/S",    group: "Blocks",  format: "per_set"},
    {key: "kill_blocks_total",   label: "Kill blocks",        short: "KB",     group: "Blocks",  format: "count"},
    {key: "kill_blocks_per_set", label: "Kill blocks / set",  short: "KB/S",   group: "Blocks",  format: "per_set"},
    {key: "kb_pct",              label: "Kill block rate",    short: "KB%",    group: "Blocks",  format: "pct"},

    {key: "receives_total",      label: "Receives",           short: "REC",    group: "Receive", format: "count"},
    {key: "receives_per_set",    label: "Receives / set",     short: "REC/S",  group: "Receive", format: "per_set"},
    {key: "serve_receives_total", label: "Serve receives",    short: "SR",     group: "Receive", format: "count"},
    {key: "digs_total",          label: "Digs",               short: "DIG",    group: "Receive", format: "count"},
    {key: "digs_per_set",        label: "Digs / set",         short: "DIG/S",  group: "Receive", format: "per_set"},

    {key: "aces_total",          label: "Aces",               short: "ACE",    group: "Serving", format: "count"},
    {key: "aces_per_set",        label: "Aces / set",         short: "ACE/S",  group: "Serving", format: "per_set"},
    {key: "service_score",       label: "Service score",      short: "SRV+",   group: "Serving", format: "count"},
];

const BY_KEY = new Map(SPEC_STAT_KEYS.map(m => [m.key as string, m]));

export const isSpecStatKey = (key: string): key is keyof PlayerSeasonStatRow => BY_KEY.has(key);

export const specStatMeta = (key: string): SpecStatKeyMeta | undefined => BY_KEY.get(key);

export const specStatLabel = (key: string): string => BY_KEY.get(key)?.label ?? key;

export const specStatShort = (key: string): string => BY_KEY.get(key)?.short ?? key;

/**
 * Participation floors. The placement bonus never scales these — a team finishing
 * first does not make its players have played more sets, and the 10/8/6 sets gate
 * is a sample-size rule rather than a performance one.
 */
export const PARTICIPATION_STAT_KEYS: ReadonlySet<string> = new Set([
    "sets_played",
    "matches_played",
]);

/**
 * Formats a threshold or a player's value the way the leaderboard prints it.
 *
 * Counts round rather than printing raw: the placement bonus multiplies them, so
 * 47 kills at +15% is 54.049999999999997 and would otherwise render in full.
 */
export function formatSpecStatValue(value: number | null, format: SpecStatFormat): string {
    if (value === null || value === undefined) return "—";
    if (format === "pct") return `${(value * 100).toFixed(1)}%`;
    if (format === "per_set") return value.toFixed(2);
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
