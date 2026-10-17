import type { ReactNode } from 'react'
import { Database } from 'lucide-react'
import { createServerSupabase } from '@/server/supabase/server'
import { getGameAbilitySettings, getGameTerms, getStoredGameDatasets } from '@/server/domains/gameData'
import { InformationProvider } from '@/app/features/gameData/information/InformationProvider'
import InformationTabs from '@/app/features/gameData/information/InformationTabs'

export default async function AdminInformationLayout({ children }: { children: ReactNode }) {
    const supabase = await createServerSupabase()
    const [stored, terms, settings, user] = await Promise.all([
        getStoredGameDatasets(supabase),
        getGameTerms(supabase),
        getGameAbilitySettings(supabase),
        supabase.auth.getUser(),
    ])
    const loadError = [stored, terms, settings].map(r => (r.ok ? null : r.error.message)).find(m => m !== null) ?? null

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Database className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">Information</h1>
                        <p className="text-sm text-muted-foreground mt-1">Game data and the wording shown for it</p>
                    </div>
                </div>
                <InformationProvider
                    initialStored={stored.ok ? stored.value : { payloads: {}, summaries: [] }}
                    initialTerms={terms.ok ? terms.value : []}
                    initialSettings={settings.ok ? settings.value : {}}
                    userId={user.data.user?.id ?? ''}
                    loadError={loadError}
                >
                    <div className="mt-4">
                        <InformationTabs />
                    </div>
                    {loadError && <p className="mt-4 text-sm text-destructive">Could not load everything: {loadError}</p>}
                    {children}
                </InformationProvider>
            </div>
        </div>
    )
}
