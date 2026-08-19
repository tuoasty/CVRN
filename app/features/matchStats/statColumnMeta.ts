import {PlayerMatchStatSet, PlayerMatchStatTotal} from "@/shared/types/db";

export type StatRow = PlayerMatchStatSet | PlayerMatchStatTotal;

export type StatColumn = {
    key: string;
    label: string;
    group: string;
    description: string;
    format: "count" | "pct";
    accessor: (row: StatRow) => number | null;
    aggregator: (rows: StatRow[]) => number | null;
};

const sumKey = (rows: StatRow[], key: keyof StatRow): number =>
    rows.reduce((acc, r) => {
        const v = r[key];
        return acc + (typeof v === "number" ? v : 0);
    }, 0);

const countCol = (
    key: keyof StatRow,
    label: string,
    group: string,
    description: string
): StatColumn => ({
    key: key as string,
    label,
    group,
    description,
    format: "count",
    accessor: r => {
        const v = r[key];
        return typeof v === "number" ? v : null;
    },
    aggregator: rows => sumKey(rows, key),
});

const HIT_EFF: StatColumn = {
    key: "hit_eff",
    label: "HIT%",
    group: "Spiking",
    description: "Hitting efficiency: (kills − spiking errors) / attempts",
    format: "pct",
    accessor: r => r.hit_eff ?? null,
    aggregator: rows => {
        const att = sumKey(rows, "total_attempts");
        if (att === 0) return null;
        return (sumKey(rows, "total_kills") - sumKey(rows, "spiking_errors")) / att;
    },
};

const SET_EFF: StatColumn = {
    key: "set_eff",
    label: "SET%",
    group: "Setting",
    description: "Set efficiency: assists / (assists + setting errors)",
    format: "pct",
    accessor: r => r.set_eff ?? null,
    aggregator: rows => {
        const a = sumKey(rows, "assists");
        const e = sumKey(rows, "setting_errors");
        if (a + e === 0) return null;
        return a / (a + e);
    },
};

const KB_PCT: StatColumn = {
    key: "kb_pct",
    label: "KB%",
    group: "Blocks",
    description: "Kill block rate: kill blocks / total block contacts",
    format: "pct",
    accessor: r => r.kb_pct ?? null,
    aggregator: rows => {
        const total = sumKey(rows, "kill_blocks") + sumKey(rows, "block_touches");
        if (total === 0) return null;
        return sumKey(rows, "kill_blocks") / total;
    },
};

const SERVICE_SCORE: StatColumn = {
    key: "service_score",
    label: "SRV+",
    group: "Serving",
    description: "Service score: aces − service errors",
    format: "count",
    accessor: r => r.service_score ?? null,
    aggregator: rows => sumKey(rows, "total_aces") - sumKey(rows, "service_errors"),
};

const POINTS: StatColumn = {
    key: "points",
    label: "PTS",
    group: "Points",
    description: "Points scored: kills + kill blocks + aces",
    format: "count",
    accessor: r => r.points ?? null,
    aggregator: rows =>
        sumKey(rows, "total_kills") + sumKey(rows, "kill_blocks") + sumKey(rows, "total_aces"),
};

const SETS_PLAYED: StatColumn = {
    key: "sets_played",
    label: "SP",
    group: "Points",
    description: "Sets played",
    format: "count",
    accessor: r => ("sets_played" in r ? r.sets_played : null),

    aggregator: rows =>
        rows.reduce((max, r) => {
            const v = "sets_played" in r ? r.sets_played ?? 0 : 0;
            return v > max ? v : max;
        }, 0),
};

const CONTRIBUTIONS: StatColumn = {
    key: "contributions",
    label: "CTB",
    group: "Overall",
    description: "Composite contribution: kills + assists + blocks + receives + aces − errors",
    format: "count",
    accessor: r => r.contributions ?? null,
    aggregator: rows =>
        sumKey(rows, "total_kills") +
        sumKey(rows, "assists") +
        sumKey(rows, "total_blocks") +
        sumKey(rows, "total_receives") +
        sumKey(rows, "total_aces") -
        sumKey(rows, "total_errors"),
};

export const DEFAULT_COLUMNS: StatColumn[] = [
    countCol("total_kills", "K", "Spiking", "Kills"),
    countCol("total_attempts", "HA", "Spiking", "Hitting attempts"),
    countCol("spiking_errors", "HE", "Spiking", "Hitting errors"),
    HIT_EFF,
    countCol("assists", "AST", "Setting", "Assists"),
    countCol("setting_errors", "STE", "Setting", "Setting errors"),
    SET_EFF,
    countCol("total_blocks", "B", "Blocks", "Total blocks"),
    KB_PCT,
    countCol("total_receives", "REC", "Receive", "Total receives"),
    countCol("total_aces", "ACE", "Serving", "Service aces"),
    SERVICE_SCORE,
    CONTRIBUTIONS,
];

export const DETAILED_COLUMNS: StatColumn[] = [

    countCol("ape_kills", "APEK", "Spiking", "Ape / dump kills"),
    countCol("ape_attempts", "APEA", "Spiking", "Ape / dump attempts"),
    countCol("delay_kills", "DLK", "Spiking", "Delay-spike kills"),
    countCol("quick_kills", "QK", "Spiking", "Quick-spike kills"),
    countCol("wipes_tools", "WT", "Spiking", "Wipes & tools"),
    countCol("total_kills", "K", "Spiking", "Total kills"),
    countCol("kill_attempts", "HA", "Spiking", "Hitting attempts"),
    countCol("spiking_errors", "HE", "Spiking", "Hitting errors"),
    HIT_EFF,

    countCol("assists", "AST", "Setting", "Assists"),
    countCol("setting_errors", "STE", "Setting", "Setting errors"),
    SET_EFF,

    countCol("kill_blocks", "KB", "Blocks", "Kill blocks"),
    countCol("block_touches", "BT", "Blocks", "Block touches"),
    countCol("total_blocks", "B", "Blocks", "Total blocks"),
    KB_PCT,

    countCol("digs", "DIG", "Receive", "Digs"),
    countCol("block_follows", "BF", "Receive", "Block follows / Block covers"),
    countCol("dives", "DIV", "Receive", "Dives"),
    countCol("total_receives", "REC", "Receive", "Total receives"),
    countCol("receive_errors", "RE", "Receive", "Receiving errors"),

    countCol("total_aces", "ACE", "Serving", "Service aces"),
    countCol("jump_serve_aces", "JS", "Serving", "Jump serve aces"),
    countCol("float_aces", "FL", "Serving", "Float serve aces"),
    countCol("service_errors", "SRE", "Serving", "Service errors"),
    SERVICE_SCORE,

    countCol("misc_errors", "ME", "Overall", "Miscellaneous errors"),
    countCol("total_errors", "E", "Overall", "Total errors"),
    CONTRIBUTIONS,
];

export const buildColumns = (detailed: boolean, includeSetsPlayed: boolean): StatColumn[] => [
    ...(includeSetsPlayed ? [SETS_PLAYED] : []),
    POINTS,
    ...(detailed ? DETAILED_COLUMNS : DEFAULT_COLUMNS),
];

export const statHeadWidthClass = (format: "count" | "pct"): string =>
    format === "pct" ? "min-w-[3.25rem]" : "min-w-[2rem]";

export const formatStatValue = (value: number | null, format: "count" | "pct"): string => {
    if (format === "pct") {
        const v = value ?? 0;
        return `${(v * 100).toFixed(1)}%`;
    }
    if (value === null || value === undefined) return "—";
    return String(value);
};

export const groupColumns = (columns: StatColumn[]): Array<{group: string; columns: StatColumn[]}> => {
    const result: Array<{group: string; columns: StatColumn[]}> = [];
    for (const col of columns) {
        const last = result[result.length - 1];
        if (last && last.group === col.group) {
            last.columns.push(col);
        } else {
            result.push({group: col.group, columns: [col]});
        }
    }
    return result;
};

export const findLeaderKeys = (rows: StatRow[], columns: StatColumn[]): Set<string> => {
    const leaders = new Set<string>();
    for (const col of columns) {

        if (col.key === "sets_played") continue;
        let maxValue: number | null = null;
        let leaderId: string | null = null;
        for (const row of rows) {
            const v = col.accessor(row);
            if (v === null) continue;
            if (col.format === "pct") {
                const denomCheck = denominatorFor(col.key, row);
                if (denomCheck !== null && denomCheck < 3) continue;
            }
            if (maxValue === null || v > maxValue) {
                maxValue = v;
                leaderId = row.player_id;
            }
        }
        if (leaderId !== null && maxValue !== null && maxValue > 0) {
            leaders.add(`${leaderId}:${col.key}`);
        }
    }
    return leaders;
};

const denominatorFor = (key: string, row: StatRow): number | null => {
    if (key === "hit_eff") return row.total_attempts ?? null;
    if (key === "set_eff") {
        const a = row.assists ?? 0;
        const e = row.setting_errors ?? 0;
        return a + e;
    }
    if (key === "kb_pct") {
        const kb = row.kill_blocks ?? 0;
        const bt = row.block_touches ?? 0;
        return kb + bt;
    }
    return null;
};
