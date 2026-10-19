import { Suspense } from 'react'
import AbilityBrowser from '@/app/features/gameData/information/AbilityBrowser'

export default function AdminRollablesPage() {
    return (
        <Suspense>
            <AbilityBrowser scope="rollable" />
        </Suspense>
    )
}
