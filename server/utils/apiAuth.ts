import { timingSafeEqual } from "crypto";

export function isValidBearerSecret(auth: string | null, secret: string | undefined): boolean {
    if (!secret || !auth) return false;
    const provided = Buffer.from(auth);
    const expected = Buffer.from(`Bearer ${secret}`);
    return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export function isValidRobloxApiSecret(auth: string | null): boolean {
    return isValidBearerSecret(auth, process.env.ROBLOX_API_SECRET);
}

export function isValidPickemsApiSecret(auth: string | null): boolean {
    return isValidBearerSecret(auth, process.env.PICKEMS_API_SECRET);
}
