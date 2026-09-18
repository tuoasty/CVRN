const STORAGE_PUBLIC_HOST = /^https:\/\/[a-z0-9]+\.supabase\.co(\/storage\/v1\/object\/public\/.*)$/;

export function toCdnUrl(url: string): string {
    const cdn = process.env.STORAGE_CDN_URL;
    if (!cdn) return url;
    const match = STORAGE_PUBLIC_HOST.exec(url);
    if (!match) return url;
    return `${cdn.replace(/\/$/, "")}${match[1]}`;
}
