"use client"

import GameDataImport from '../GameDataImport'
import { useInformation } from './InformationProvider'

export default function InformationImport() {
    const { stored, termList, loadError, replaceStored, replaceSpecs, replaceSkips } = useInformation()
    return (
        <GameDataImport
            initialStored={stored}
            terms={termList}
            storedError={loadError}
            onStoredChange={replaceStored}
            onSpecsChange={replaceSpecs}
            onSkipsChange={replaceSkips}
        />
    )
}
