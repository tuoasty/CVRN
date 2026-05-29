import { Suspense } from 'react';
import { createServerSupabase } from '@/server/supabase/server';
import SyncHistoryContent from './SyncHistoryContent';

async function getCanRevert(): Promise<boolean> {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from('user_roles').select('role').eq('user_id', user.id).single();
    return data?.role !== 'stat_tracker';
}

export default async function AdminSyncHistoryPage() {
    const canRevert = await getCanRevert();

    return (
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
            <SyncHistoryContent canRevert={canRevert} />
        </Suspense>
    );
}
