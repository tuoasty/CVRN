import { Suspense } from 'react'
import AbilityBrowser from '@/app/features/gameData/information/AbilityBrowser'

export default function AdminExclusivesPage() {
    return (
        <Suspense>
            <AbilityBrowser scope="exclusive" />
        </Suspense>
    )
}
