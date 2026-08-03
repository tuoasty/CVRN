import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SITE_URL"];
const EXPECTED = ["GOOGLE_SHEETS_CREDENTIALS", "CRON_SECRET"];

const EX_CONFIG = 78;

function die(message: string): never {

    console.error(`[startup] ${message}`);
    process.exit(EX_CONFIG);
}

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
    die(`Missing required environment variables: ${missing.join(", ")}`);
}

try {
    new URL(process.env.SITE_URL!);
} catch {
    die(`SITE_URL is not a valid absolute URL: ${process.env.SITE_URL}`);
}

const degraded = EXPECTED.filter((key) => !process.env[key]);
if (degraded.length > 0) {
    console.warn(`[startup] Missing ${degraded.join(", ")} — Sheets sync and cron routes will fail.`);
}

if (process.env.GOOGLE_SHEETS_CREDENTIALS) {
    try {
        const creds = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
        if (!creds.client_email || !creds.private_key) {
            console.warn("[startup] GOOGLE_SHEETS_CREDENTIALS parsed but is missing client_email or private_key — Sheets sync will fail.");
        }
    } catch (error) {
        console.warn(`[startup] GOOGLE_SHEETS_CREDENTIALS is not valid JSON (check EnvironmentFile quoting — it must be single-quoted so \\n stays literal) — Sheets sync will fail. ${error}`);
    }
}

function checkIncrementalCacheWritable(): void {

    if (process.env.VERCEL) return;

    const cacheDir = join(process.cwd(), ".next", "cache");
    const probe = join(cacheDir, `.write-probe-${process.pid}`);

    try {
        if (!existsSync(cacheDir)) mkdirSync(cacheDir, { recursive: true });
        writeFileSync(probe, "");
        unlinkSync(probe);
    } catch (error) {
        console.error(
            `[startup] ${cacheDir} is not writable by uid=${process.getuid?.() ?? "n/a"} — ` +
            "Next's data cache is disabled, so every public page will re-render and hit Supabase " +
            `on every request. ${error}`,
        );
    }
}

checkIncrementalCacheWritable();
