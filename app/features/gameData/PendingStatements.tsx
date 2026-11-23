"use client"

import type { KindChoice, PendingStatement } from '@/server/domains/gameData/types/preview'
import { DATASET_LABELS } from '@/server/domains/gameData/helpers/datasets/registry'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'

interface Props {
    pending: PendingStatement[]
    onChoose: (line: number, choice: KindChoice) => void
}

export default function PendingStatements({ pending, onChoose }: Props) {
    if (pending.length === 0) return null

    return (
        <div className="mt-2.5">
            <p className="text-sm text-muted-foreground">These lines fit more than one dataset. Choose what each one is.</p>
            <ul className="mt-1.5">
                {pending.map(p => (
                    <li key={p.line} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
                        <span className="w-20 font-mono text-xs tabular-nums text-muted-foreground">line {p.line}</span>
                        <InlineSwitch<KindChoice | ''>
                            label={`Read line ${p.line} as`}
                            options={[...p.candidates.map(k => ({ value: k, label: DATASET_LABELS[k] })), { value: 'skip', label: 'Skip' }]}
                            value=""
                            onChange={choice => { if (choice !== '') onChoose(p.line, choice) }}
                        />
                    </li>
                ))}
            </ul>
        </div>
    )
}
