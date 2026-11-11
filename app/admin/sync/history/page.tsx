import { Suspense } from 'react';
import { createServerSupabase } from '@/server/supabase/server';
import { getCurrentGroups } from '@/server/domains/auth/queries/getCurrentGroups';
import SyncHistoryContent from './SyncHistoryContent';

async function getCanRevert(): Promise<boolean> {
    const supabase = await createServerSupabase();
    const groups = await getCurrentGroups(supabase);
    return groups.ok && (groups.value.includes('admin') || groups.value.includes('super_admin'));
}

export default async function AdminSyncHistoryPage() {
    const canRevert = await getCanRevert();

    return (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
            <SyncHistoryContent canRevert={canRevert} />
        </Suspense>
    );
}
