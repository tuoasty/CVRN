import {PlayerSeasonStat} from "@/server/domains/player";

export type StatFormat = "count" | "per_set" | "pct" | "net";

export type PlayerStatColumn = {
    key: keyof PlayerSeasonStat;
    label: string;
    group: string;
    description: string;
    format: StatFormat;
};

const ps = (
    key: keyof PlayerSeasonStat,
    label: string,
    group: string,
    description: string
): PlayerStatColumn => ({key, label, group, description, format: "per_set"});

const ct = (
    key: keyof PlayerSeasonStat,
    label: string,
    group: string,
    description: string
): PlayerStatColumn => ({key, label, group, description, format: "count"});

export type StatView = "overview" | "spiking" | "setting" | "blocking" | "receiving" | "serving";

export const STAT_VIEWS: {value: StatView; label: string}[] = [
    {value: "overview",  label: "Overview"},
    {value: "spiking",   label: "Spiking"},
    {value: "setting",   label: "Setting"},
    {value: "blocking",  label: "Blocking"},
    {value: "receiving", label: "Receiving"},
    {value: "serving",   label: "Serving"},
];

const SEASON_COLUMNS: PlayerStatColumn[] = [
    {key: "sets_played",    label: "SP",    group: "Season", description: "Sets played", format: "count"},
    {key: "points_total",   label: "PTS",   group: "Season", description: "Total points scored: kills + kill blocks + aces", format: "count"},
    {key: "points_per_set", label: "PTS/S", group: "Season", description: "Points scored per set", format: "per_set"},
];

export const STAT_VIEW_COLUMNS: Record<StatView, PlayerStatColumn[]> = {
    overview: [
        ...SEASON_COLUMNS,
        ct("kills_total",       "K",    "Spiking", "Kills (season total)"),
        ps("kills_per_set",     "K/S",  "Spiking", "Kills per set"),
        {key: "hit_eff",        label: "HIT%", group: "Spiking", description: "Hitting efficiency: (kills − errors) / attempts", format: "pct"},
        ct("blocks_total",      "B",    "Blocks",  "Total blocks (season total)"),
        ps("blocks_per_set",    "B/S",  "Blocks",  "Total blocks per set"),
        ct("kill_blocks_total", "KB",   "Blocks",  "Kill blocks (season total)"),
        ps("kill_blocks_per_set", "KB/S", "Blocks", "Kill blocks per set"),
        ct("assists_total",     "AST",  "Setting", "Assists (season total)"),
        ps("assists_per_set",   "AST/S", "Setting", "Assists per set"),
        {key: "set_eff",        label: "SET%", group: "Setting", description: "Set efficiency: assists / (assists + setting errors)", format: "pct"},
        ct("receives_total",    "REC",  "Receive", "Total receives (season total)"),
        ps("receives_per_set",  "REC/S", "Receive", "Total receives per set"),
        ct("aces_total",           "ACE",  "Serving", "Aces (season total)"),
        ps("aces_per_set",         "ACE/S", "Serving", "Aces per set"),
    ],
    spiking: [
        ...SEASON_COLUMNS,
        ct("kills_total",          "K",    "Spiking", "Kills (season total)"),
        ps("kills_per_set",        "K/S",  "Spiking", "Kills per set"),
        ct("kill_attempts_total",  "HA",   "Spiking", "Hitting attempts (season total)"),
        ps("kill_attempts_per_set", "HA/S", "Spiking", "Hitting attempts per set"),
        ct("spiking_errors_total", "HE",   "Spiking", "Hitting errors (season total)"),
        ps("spiking_errors_per_set", "HE/S", "Spiking", "Hitting errors per set"),
        {key: "hit_eff",           label: "HIT%", group: "Spiking", description: "Hitting efficiency: (kills − errors) / attempts", format: "pct"},
        ct("ape_kills_total",      "APK",  "Spiking", "Ape/dump kills (season total)"),
        ps("ape_kills_per_set",    "APK/S", "Spiking", "Ape/dump kills per set"),
        ct("delay_kills_total",    "DLK",  "Spiking", "Delay-spike kills (season total)"),
        ps("delay_kills_per_set",  "DLK/S", "Spiking", "Delay-spike kills per set"),
        ct("quick_kills_total",    "QK",   "Spiking", "Quick-spike kills (season total)"),
        ps("quick_kills_per_set",  "QK/S", "Spiking", "Quick-spike kills per set"),
        ct("wipes_tools_total",    "WT",   "Spiking", "Wipes & tools (season total)"),
        ps("wipes_tools_per_set",  "WT/S", "Spiking", "Wipes & tools per set"),
    ],
    setting: [
        ...SEASON_COLUMNS,
        ct("assists_total",        "AST",  "Setting", "Assists (season total)"),
        ps("assists_per_set",      "AST/S", "Setting", "Assists per set"),
        {key: "set_eff",           label: "SET%", group: "Setting", description: "Set efficiency: assists / (assists + setting errors)", format: "pct"},
        ct("setting_errors_total", "STE",  "Setting", "Setting errors (season total)"),
        ps("setting_errors_per_set", "STE/S", "Setting", "Setting errors per set"),
    ],
    blocking: [
        ...SEASON_COLUMNS,
        ct("blocks_total",         "B",    "Blocks", "Total blocks (season total)"),
        ps("blocks_per_set",       "B/S",  "Blocks", "Total blocks per set"),
        ct("kill_blocks_total",    "KB",   "Blocks", "Kill blocks (season total)"),
        ps("kill_blocks_per_set",  "KB/S", "Blocks", "Kill blocks per set"),
        ct("block_touches_total",  "BT",   "Blocks", "Block touches (season total)"),
        ps("block_touches_per_set", "BT/S", "Blocks", "Block touches per set"),
        {key: "kb_pct",            label: "KB%", group: "Blocks", description: "Kill block rate: kill blocks / total block contacts", format: "pct"},
    ],
    receiving: [
        ...SEASON_COLUMNS,
        ct("receives_total",       "REC",  "Receive", "Total receives (season total)"),
        ps("receives_per_set",     "REC/S", "Receive", "Total receives per set"),
        ct("digs_total",           "DIG",  "Receive", "Digs (season total)"),
        ps("digs_per_set",         "DIG/S", "Receive", "Digs per set"),
        ct("block_follows_total",  "BF",   "Receive", "Block follows (season total)"),
        ps("block_follows_per_set", "BF/S", "Receive", "Block follows per set"),
        ct("dives_total",          "DIV",  "Receive", "Dives (season total)"),
        ps("dives_per_set",        "DIV/S", "Receive", "Dives per set"),
    ],
    serving: [
        ...SEASON_COLUMNS,
        ct("aces_total",           "ACE",  "Serving", "Aces (season total)"),
        ps("aces_per_set",         "ACE/S", "Serving", "Aces per set"),
        ct("jump_serve_aces_total", "JS",  "Serving", "Jump serve aces (season total)"),
        ps("jump_serve_aces_per_set", "JS/S", "Serving", "Jump serve aces per set"),
        ct("float_aces_total",     "FL",   "Serving", "Float serve aces (season total)"),
        ps("float_aces_per_set",   "FL/S", "Serving", "Float serve aces per set"),
        {key: "service_score",     label: "SRV+", group: "Serving", description: "Service score: aces − service errors (season net total)", format: "net"},
        ct("service_errors_total", "SRE",  "Serving", "Service errors (season total)"),
        ps("service_errors_per_set", "SRE/S", "Serving", "Service errors per set"),
    ],
};

export const MIN_SETS_FOR_RATE = 6;

export const STAT_VIEW_DEFAULT_SORT: Record<StatView, keyof PlayerSeasonStat> = {
    overview:  "points_total",
    spiking:   "points_total",
    setting:   "assists_total",
    blocking:  "blocks_total",
    receiving: "receives_total",
    serving:   "aces_total",
};

export function formatPlayerStat(value: number | null, format: StatFormat): string {
    if (value === null || value === undefined) return "—";
    if (format === "pct") return `${(value * 100).toFixed(1)}%`;
    if (format === "net") return value >= 0 ? `+${value}` : String(value);
    return String(value);
}

export const playerHeadWidthClass = (format: StatFormat): string =>
    format === "pct" ? "min-w-[3.25rem]" : format === "count" ? "min-w-[2rem]" : "min-w-[2.75rem]";

export const playerColWidthClass = (format: StatFormat): string =>
    format === "pct" ? "w-[3.75rem]" : format === "count" ? "w-[3.25rem]" : "w-16";

export function groupPlayerColumns(
    columns: PlayerStatColumn[]
): Array<{group: string; columns: PlayerStatColumn[]}> {
    const result: Array<{group: string; columns: PlayerStatColumn[]}> = [];
    for (const col of columns) {
        const last = result[result.length - 1];
        if (last && last.group === col.group) {
            last.columns.push(col);
        } else {
            result.push({group: col.group, columns: [col]});
        }
    }
    return result;
}
