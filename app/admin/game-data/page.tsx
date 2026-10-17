import { Database } from 'lucide-react'
import GameDataImport from '@/app/features/gameData/GameDataImport'
import { createServerSupabase } from '@/server/supabase/server'
import { getGameTerms, getStoredGameDatasets } from '@/server/domains/gameData'

export default async function AdminGameDataPage() {
    const supabase = await createServerSupabase()
    const [stored, terms] = await Promise.all([getStoredGameDatasets(supabase), getGameTerms(supabase)])
    const loadError = !stored.ok ? stored.error.message : !terms.ok ? terms.error.message : null

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Database className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider text-foreground">Game Data</h1>
                        <p className="text-sm text-muted-foreground mt-1">Import abilities, rarities and rollable lists from the game&apos;s Lua tables</p>
                    </div>
                </div>
                <GameDataImport
                    initialStored={stored.ok ? stored.value : { payloads: {}, summaries: [] }}
                    terms={terms.ok ? terms.value : []}
                    storedError={loadError}
                />
            </div>
        </div>
    )
}
