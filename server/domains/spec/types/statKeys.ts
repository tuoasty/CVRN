import {PlayerSeasonStatRow} from "@/shared/types/db";

export type SpecStatFormat = "count" | "per_set" | "pct";

export type SpecStatKeyMeta = {
    key: keyof PlayerSeasonStatRow;

    label: string;

    short: string;
    group: string;
    format: SpecStatFormat;
    lowerIsBetter?: boolean;
};

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
    {key: "digs_total",          label: "Digs",               short: "DIG",    group: "Receive", format: "count"},
    {key: "digs_per_set",        label: "Digs / set",         short: "DIG/S",  group: "Receive", format: "per_set"},
    {key: "dives_total",         label: "Dives",              short: "DIV",    group: "Receive", format: "count"},
    {key: "dives_per_set",       label: "Dives / set",        short: "DIV/S",  group: "Receive", format: "per_set"},
    {key: "rec_eff",             label: "Receive efficiency", short: "REC%",   group: "Receive", format: "pct"},

    {key: "aces_total",          label: "Aces",               short: "ACE",    group: "Serving", format: "count"},
    {key: "aces_per_set",        label: "Aces / set",         short: "ACE/S",  group: "Serving", format: "per_set"},
    {key: "jump_serve_aces_total", label: "Jump serve aces",  short: "JS",     group: "Serving", format: "count"},
    {key: "jump_serve_aces_per_set", label: "Jump serve aces / set", short: "JS/S", group: "Serving", format: "per_set"},
    {key: "float_aces_total",    label: "Float serve aces",   short: "FL",     group: "Serving", format: "count"},
    {key: "float_aces_per_set",  label: "Float serve aces / set", short: "FL/S", group: "Serving", format: "per_set"},
    {key: "service_score",       label: "Service score",      short: "SRV+",   group: "Serving", format: "count"},

    {key: "errors_total",        label: "Total errors",       short: "ERR",    group: "Errors",  format: "count", lowerIsBetter: true},
];

const BY_KEY = new Map(SPEC_STAT_KEYS.map(m => [m.key as string, m]));

export const isSpecStatKey = (key: string): key is keyof PlayerSeasonStatRow => BY_KEY.has(key);

export const specStatMeta = (key: string): SpecStatKeyMeta | undefined => BY_KEY.get(key);

export const specStatLabel = (key: string): string => BY_KEY.get(key)?.label ?? key;

export const specStatShort = (key: string): string => BY_KEY.get(key)?.short ?? key;

export const isLowerIsBetterStatKey = (key: string): boolean => BY_KEY.get(key)?.lowerIsBetter === true;

export const isEfficiencyStatKey = (key: string): boolean => BY_KEY.get(key)?.format === "pct";

export const PARTICIPATION_STAT_KEYS: ReadonlySet<string> = new Set([
    "sets_played",
    "matches_played",
]);

export function formatSpecStatValue(value: number | null, format: SpecStatFormat): string {
    if (value === null || value === undefined) return "—";
    if (format === "pct") return `${(value * 100).toFixed(1)}%`;
    if (format === "per_set") return value.toFixed(2);
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
}
