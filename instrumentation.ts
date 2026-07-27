const REQUIRED = ["SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "SITE_URL"];
const EXPECTED = ["GOOGLE_SHEETS_CREDENTIALS", "CRON_SECRET"];

// sysexits.h EX_CONFIG. Pair with RestartPreventExitStatus=78 in the systemd unit so a
// bad env file stops the service outright instead of flapping like a crash would.
const EX_CONFIG = 78;

export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const missing = REQUIRED.filter((key) => !process.env[key]);
    if (missing.length > 0) {
        // exit, not throw: Next swallows a thrown error here and the process stays up
        // serving nothing, which systemd Restart=always cannot see.
        console.error(`[startup] Missing required environment variables: ${missing.join(", ")}`);
        process.exit(EX_CONFIG);
    }

    const degraded = EXPECTED.filter((key) => !process.env[key]);
    if (degraded.length > 0) {
        console.warn(`[startup] Missing ${degraded.join(", ")} — Sheets sync and cron routes will fail.`);
    }
}
