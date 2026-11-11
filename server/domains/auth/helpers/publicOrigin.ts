const HOST = /^[A-Za-z0-9.-]+(:\d{1,5})?$/;

function first(value: string | null): string | null {
    const head = value?.split(",")[0]?.trim();
    return head ? head : null;
}

export function publicOrigin(headers: Headers, fallback: string): string {
    const host = first(headers.get("x-forwarded-host"));
    if (!host || !HOST.test(host)) return fallback;
    const proto = first(headers.get("x-forwarded-proto"));
    return `${proto === "http" ? "http" : "https"}://${host}`;
}
