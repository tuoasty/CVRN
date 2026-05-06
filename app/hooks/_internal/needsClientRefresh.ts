const SYNC_INTERVAL_MS = 60 * 60 * 1000;

type SyncableRow = {
    avatar_url: string | null;
    last_synced_at: string | null;
    roblox_user_id: string | null;
};

export function needsClientRefresh(rows: SyncableRow[]): boolean {
    return rows.some(r => {
        if (!r.roblox_user_id) return false;
        if (!r.avatar_url) return true;
        if (!r.last_synced_at) return true;
        return Date.now() - new Date(r.last_synced_at).getTime() > SYNC_INTERVAL_MS;
    });
}
