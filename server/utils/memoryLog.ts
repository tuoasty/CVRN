import {getHeapStatistics} from "node:v8";

const toMb = (bytes: number) => Math.round(bytes / (1024 * 1024));

function line(fields: Record<string, number | string>): string {
    return `[memory] ${JSON.stringify({ts: new Date().toISOString(), ...fields})}`;
}

function sample(): Record<string, number> {
    const usage = process.memoryUsage();
    return {
        rss: toMb(usage.rss),
        heapTotal: toMb(usage.heapTotal),
        heapUsed: toMb(usage.heapUsed),
        external: toMb(usage.external),
        arrayBuffers: toMb(usage.arrayBuffers),
    };
}

export function startMemoryLog(
    rawSeconds: string | undefined,
    write: (text: string) => void = text => console.log(text),
): ReturnType<typeof setInterval> | null {
    const seconds = Number(rawSeconds);
    if (!Number.isFinite(seconds) || seconds <= 0) return null;

    write(line({heapLimit: toMb(getHeapStatistics().heap_size_limit), intervalSeconds: seconds}));
    const timer = setInterval(() => write(line(sample())), seconds * 1000);
    timer.unref();
    return timer;
}
