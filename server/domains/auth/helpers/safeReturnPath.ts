export function safeReturnPath(raw: string | null): string | null {
    if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) return null;
    try {
        const parsed = new URL(raw, "http://x");
        if (parsed.origin !== "http://x") return null;
        const out = parsed.pathname + parsed.search;
        if (!out.startsWith("/") || out.startsWith("//") || out.includes("\\")) return null;
        return out;
    } catch {
        return null;
    }
}
