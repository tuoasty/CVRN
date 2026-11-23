"use client"

import type { KindChoice, PendingStatement } from '@/server/domains/gameData/types/preview'
import { DATASET_LABELS } from '@/server/domains/gameData/helpers/datasets/registry'
import { InlineSwitch } from '@/app/components/filters/InlineSwitch'

interface Props {
    pending: PendingStatement[]
    onChoose: (line: number, choice: KindChoice) => void
    disabled: boolean
    fileFor: (line: number) => string | null
}

export default function PendingStatements({ pending, onChoose, disabled, fileFor }: Props) {
    if (pending.length === 0) return null

    return (
        <div className="mt-2.5">
            <p className="text-sm text-muted-foreground">These lines fit more than one dataset. Choose what each one is.</p>
            <ul className="mt-1.5">
                {pending.map(p => {
                    const file = fileFor(p.line)
                    return (
                        <li key={p.line} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-1.5 text-sm">
                            <span className="min-w-20 font-mono text-xs tabular-nums text-muted-foreground">
                                line {p.line}
                                {file && <span className="ml-2 font-sans text-foreground">{file}</span>}
                            </span>
                            <InlineSwitch<KindChoice | ''>
                                label={`Read line ${p.line} as`}
                                options={[...p.candidates.map(k => ({ value: k, label: DATASET_LABELS[k], disabled })), { value: 'skip', label: 'Skip', disabled }]}
                                value=""
                                onChange={choice => { if (choice !== '') onChoose(p.line, choice) }}
                            />
                        </li>
                    )
                })}
            </ul>
        </div>
    )
}
