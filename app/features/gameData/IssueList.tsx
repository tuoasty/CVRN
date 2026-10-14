import { CircleX, TriangleAlert } from 'lucide-react'
import type { DatasetIssue } from '@/server/domains/gameData/types/datasets'
import { DATASET_LABELS } from '@/server/domains/gameData/helpers/datasets/registry'
import { cn } from '@/lib/utils'

export default function IssueList({ issues, showKind = false }: { issues: DatasetIssue[]; showKind?: boolean }) {
    if (issues.length === 0) return null
    const sorted = [...issues].sort((a, b) => (a.level === b.level ? 0 : a.level === 'error' ? -1 : 1))

    return (
        <ul className="space-y-1">
            {sorted.map((issue, i) => (
                <li key={i} className={cn('flex items-start gap-2 text-sm', issue.level === 'error' ? 'text-destructive' : 'text-muted-foreground')}>
                    {issue.level === 'error'
                        ? <CircleX className="h-4 w-4 mt-0.5 shrink-0" />
                        : <TriangleAlert className="h-4 w-4 mt-0.5 shrink-0" />}
                    <span>
                        {showKind && issue.kind && <span className="font-medium text-foreground">{DATASET_LABELS[issue.kind]}: </span>}
                        {issue.entry && <span className="font-medium text-foreground">{issue.entry}: </span>}
                        {issue.message}
                    </span>
                </li>
            ))}
        </ul>
    )
}
