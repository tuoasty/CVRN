"use client"

import { cn } from '@/lib/utils'

export type EditorMode = 'edit' | 'preview'

interface Props {
    mode: EditorMode
    onChange: (mode: EditorMode) => void
}

export default function ArticleEditorModeToggle({ mode, onChange }: Props) {
    return (
        <div className="inline-flex rounded-sm border border-border overflow-hidden">
            <button type="button" onClick={() => onChange('edit')}
                className={cn('px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors',
                    mode === 'edit' ? 'bg-muted text-foreground' : 'bg-transparent text-muted-foreground')}>
                Edit
            </button>
            <button type="button" onClick={() => onChange('preview')}
                className={cn('px-3 py-1 text-xs font-medium uppercase tracking-wide transition-colors',
                    mode === 'preview' ? 'bg-muted text-foreground' : 'bg-transparent text-muted-foreground')}>
                Preview
            </button>
        </div>
    )
}
