import { Suspense } from 'react'
import SpecLoadoutBrowser from '@/app/features/gameData/information/specs/SpecLoadoutBrowser'

export default function AdminSpecLoadoutsPage() {
    return (
        <Suspense>
            <SpecLoadoutBrowser />
        </Suspense>
    )
}
