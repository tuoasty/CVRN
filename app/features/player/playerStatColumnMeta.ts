import {PlayerSeasonStat} from "@/server/domains/player";

export type StatFormat = "per_set" | "pct" | "net";

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

export const PLAYER_COMPACT_COLUMNS: PlayerStatColumn[] = [
    {key: "sets_played",          label: "SP",   group: "Season",   description: "Sets played",             format: "per_set"},
    ps("kills_per_set",           "K/S",  "Spiking",  "Kills per set"),
    ps("kill_attempts_per_set",   "HA/S", "Spiking",  "Hitting attempts per set"),
    ps("spiking_errors_per_set",  "HE/S", "Spiking",  "Hitting errors per set"),
    {key: "hit_eff",              label: "HIT%", group: "Spiking",  description: "Hitting efficiency: (kills − errors) / attempts", format: "pct"},
    ps("assists_per_set",         "AST/S","Setting",  "Assists per set"),
    ps("setting_errors_per_set",  "STE/S","Setting",  "Setting errors per set"),
    {key: "set_eff",              label: "SET%", group: "Setting",  description: "Set efficiency: assists / (assists + setting errors)", format: "pct"},
    ps("blocks_per_set",          "B/S",  "Blocks",   "Total blocks per set"),
    {key: "kb_pct",               label: "KB%",  group: "Blocks",   description: "Kill block rate: kill blocks / total block contacts", format: "pct"},
    ps("receives_per_set",        "REC/S","Receive",  "Total receives per set"),
    ps("aces_per_set",            "ACE/S","Serving",  "Aces per set"),
    {key: "service_score",        label: "SRV+", group: "Serving",  description: "Service score: aces − service errors (season net total)", format: "net"},
];

export const PLAYER_DETAILED_COLUMNS: PlayerStatColumn[] = [
    {key: "sets_played",              label: "SP",    group: "Season",  description: "Sets played",                  format: "per_set"},
    ps("ape_kills_per_set",           "APK/S","Spiking", "Ape/dump kills per set"),
    ps("ape_attempts_per_set",        "APA/S","Spiking", "Ape/dump attempts per set"),
    ps("delay_kills_per_set",         "DLK/S","Spiking", "Delay-spike kills per set"),
    ps("quick_kills_per_set",         "QK/S", "Spiking", "Quick-spike kills per set"),
    ps("wipes_tools_per_set",         "WT/S", "Spiking", "Wipes & tools per set"),
    ps("kills_per_set",               "K/S",  "Spiking", "Total kills per set"),
    ps("kill_attempts_per_set",       "HA/S", "Spiking", "Hitting attempts per set"),
    ps("spiking_errors_per_set",      "HE/S", "Spiking", "Hitting errors per set"),
    {key: "hit_eff",                  label: "HIT%", group: "Spiking",  description: "Hitting efficiency", format: "pct"},
    ps("assists_per_set",             "AST/S","Setting", "Assists per set"),
    ps("setting_errors_per_set",      "STE/S","Setting", "Setting errors per set"),
    {key: "set_eff",                  label: "SET%", group: "Setting",  description: "Set efficiency",    format: "pct"},
    ps("kill_blocks_per_set",         "KB/S", "Blocks",  "Kill blocks per set"),
    ps("block_touches_per_set",       "BT/S", "Blocks",  "Block touches per set"),
    ps("blocks_per_set",              "B/S",  "Blocks",  "Total blocks per set"),
    {key: "kb_pct",                   label: "KB%",  group: "Blocks",   description: "Kill block rate",   format: "pct"},
    ps("serve_receives_per_set",      "SR/S", "Receive", "Serve receives per set"),
    ps("digs_per_set",                "DIG/S","Receive", "Digs per set"),
    ps("block_follows_per_set",       "BF/S", "Receive", "Block follows per set"),
    ps("dives_per_set",               "DIV/S","Receive", "Dives per set"),
    ps("receives_per_set",            "REC/S","Receive", "Total receives per set"),
    ps("aces_per_set",                "ACE/S","Serving", "Aces per set"),
    ps("service_errors_per_set",      "SRE/S","Serving", "Service errors per set"),
    {key: "service_score",            label: "SRV+", group: "Serving",  description: "Service score: aces − service errors (net total)", format: "net"},
    ps("misc_errors_per_set",         "ME/S", "Overall", "Misc errors per set"),
    ps("errors_per_set",              "E/S",  "Overall", "Total errors per set"),
];

export function formatPlayerStat(value: number | null, format: StatFormat): string {
    if (value === null || value === undefined) return "—";
    if (format === "pct") return `${(value * 100).toFixed(1)}%`;
    if (format === "net") return value >= 0 ? `+${value}` : String(value);
    return String(value);
}

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
