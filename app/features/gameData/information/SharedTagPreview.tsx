"use client"

import { useState } from 'react'
import type { TermChange } from '@/server/domains/gameData/terms/termEdit'

const FIRST = 4

function changedLines(change: TermChange): { removed: string[]; added: string[] } {
    return {
        removed: change.before.filter(line => !change.after.includes(line)),
        added: change.after.filter(line => !change.before.includes(line)),
    }
}

export default function SharedTagPreview({ tag, changes, editing }: { tag: string; changes: TermChange[]; editing: string | null }) {
    const [all, setAll] = useState(false)
    if (changes.length === 0) return null
    const others = changes.filter(c => c.ability !== editing).length
    const shown = all ? changes : changes.slice(0, FIRST)

    return (
        <div className="mt-4">
            <p className="text-sm text-muted-foreground">
                {others > 0
                    ? <><span className="font-semibold text-secondary">Shared wording.</span> <span className="font-mono">{tag}</span> also changes {others} other {others === 1 ? 'ability' : 'abilities'}. Saving rewords all of them:</>
                    : 'Saving changes this line:'}
            </p>
            <div className="mt-2 grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
                {shown.map(change => {
                    const { removed, added } = changedLines(change)
                    return (
                        <div key={change.ability} className="contents">
                            <span className="truncate text-muted-foreground">{change.ability}</span>
                            <div className="min-w-0">
                                {removed.map((line, i) => (
                                    <p key={`r${i}`} className="text-muted-foreground line-through decoration-muted-foreground/70">{line.trim()}</p>
                                ))}
                                {added.map((line, i) => <p key={`a${i}`} className="text-foreground">{line.trim()}</p>)}
                            </div>
                        </div>
                    )
                })}
            </div>
            {changes.length > FIRST && (
                <button
                    type="button"
                    onClick={() => setAll(v => !v)}
                    className="mt-2 text-sm text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
                >
                    {all ? 'Show fewer' : `Show all ${changes.length}`}
                </button>
            )}
        </div>
    )
}
