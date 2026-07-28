import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SITE_URL"];
const EXPECTED = ["GOOGLE_SHEETS_CREDENTIALS", "CRON_SECRET"];

// sysexits.h EX_CONFIG. Pair with RestartPreventExitStatus=78 in the systemd unit so a
// bad env file stops the service outright instead of flapping like a crash would.
const EX_CONFIG = 78;

function die(message: string): never {
    // exit, not throw: Next swallows a thrown error here and the process stays up
    // serving nothing, which systemd Restart=always cannot see.
    console.error(`[startup] ${message}`);
    process.exit(EX_CONFIG);
}

const missing = REQUIRED.filter((key) => !process.env[key]);
if (missing.length > 0) {
    die(`Missing required environment variables: ${missing.join(", ")}`);
}

// Only an unparseable value is fatal — invite emails would carry a garbage redirect either
// way. A trailing slash is handled at the call site (inviteUser.ts) rather than here:
// exiting 78 over a formatting nit would take the whole site down via
// RestartPreventExitStatus, which is wildly out of proportion to the defect.
try {
    new URL(process.env.SITE_URL!);
} catch {
    die(`SITE_URL is not a valid absolute URL: ${process.env.SITE_URL}`);
}

const degraded = EXPECTED.filter((key) => !process.env[key]);
if (degraded.length > 0) {
    console.warn(`[startup] Missing ${degraded.join(", ")} — Sheets sync and cron routes will fail.`);
}

/**
 * The credentials are a ~2.3KB single-line JSON blob whose private key contains escaped
 * newlines, delivered on the VPS through a systemd EnvironmentFile. That file's quoting
 * rules are the likeliest thing to mangle it (single quotes keep `\n` literal, double
 * quotes make systemd expand them and break the JSON). Without this check the damage first
 * shows up in a cron log at 13:00 UTC.
 */
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

/**
 * Next's default incremental cache writes under <distDir>/cache, which is where every
 * unstable_cache entry from server/cache/publicReads.ts lives. If the service user cannot
 * write there — the deploy user owns the rsync'd tree, or systemd's ProtectSystem=strict
 * has no matching ReadWritePaths — Next does not fail. It silently serves every public page
 * uncached, so each request re-renders and hits Supabase.
 *
 * That symptom is latency and CPU on a box already documented as slow for two other
 * reasons (1 vCPU, single origin), which is exactly why it has to announce itself here.
 * Warn rather than exit: losing the cache is a performance regression, and taking the site
 * down over it via RestartPreventExitStatus would be the worse outcome.
 */
function checkIncrementalCacheWritable(): void {
    // Vercel's filesystem is read-only outside /tmp and it substitutes its own cache
    // handler, so probing there would train the reader to ignore this exact message.
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
