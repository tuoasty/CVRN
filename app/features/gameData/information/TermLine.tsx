import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TermStatus = 'ok' | 'unverified' | 'unhandled'

const STATUS_TEXT: Record<Exclude<TermStatus, 'ok'>, string> = {
    unverified: 'Unverified',
    unhandled: 'Not handled',
}

function splitAround(sentence: string, part: string | null): [string, string, string] {
    if (!part) return ['', sentence, '']
    const at = sentence.toLowerCase().indexOf(part.toLowerCase())
    if (at === -1) return ['', sentence, '']
    return [sentence.slice(0, at), sentence.slice(at, at + part.length), sentence.slice(at + part.length)]
}

interface TermLineProps {
    raw: string
    sentence: string | null
    editable: string | null
    status: TermStatus
    nested?: boolean
    children?: ReactNode
}

export default function TermLine({ raw, sentence, editable, status, nested, children }: TermLineProps) {
    const [before, part, after] = sentence === null ? ['', '', ''] : splitAround(sentence, editable)

    return (
        <div className={cn(nested ? 'pl-5 pt-2' : 'pt-3 pb-1')}>
            <div className="flex items-baseline gap-3">
                <span className="font-mono text-xs text-muted-foreground">{raw}</span>
                {status !== 'ok' && <span className="text-xs font-medium text-secondary">{STATUS_TEXT[status]}</span>}
            </div>
            {sentence === null
                ? <p className={cn('mt-0.5 text-muted-foreground', nested ? 'text-sm' : 'text-base')}>Not shown for this value</p>
                : (
                    <p className={cn('mt-0.5 text-foreground', nested ? 'text-sm' : 'text-base')}>
                        {before}
                        <span className="rounded-sm bg-muted px-1 py-px">{part}</span>
                        {after}
                    </p>
                )}
            {children}
        </div>
    )
}
