'use client';

import {Button} from '@/app/components/ui/button';
import {DraftSummary} from './regionDraft';

interface Props {
    regionCode: string;
    summary: DraftSummary;
    saving: boolean;
    onDiscard: () => void;
    onSave: () => void;
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export default function DraftSaveBar({regionCode, summary, saving, onDiscard, onSave}: Props) {
    const code = regionCode.toUpperCase();
    const blocked = summary.overflowSpecIds.length > 0;
    return (
        <div className="sticky bottom-0 mt-auto flex items-center gap-2 px-5 py-2.5 border-t border-border bg-card">
            <span className="text-sm text-muted-foreground">
                Saving to <span className="text-foreground font-medium">{code}</span> only ·{' '}
                <span className="font-mono tabular-nums">{summary.changes}</span> {summary.changes === 1 ? 'change' : 'changes'} across{' '}
                {plural(summary.specs, 'spec')}
                {summary.unset > 0 && (
                    <>
                        {' · '}
                        <span className="font-mono tabular-nums">{summary.unset}</span> unset (saves, blocks publish)
                    </>
                )}
                {blocked && (
                    <span className="text-destructive">
                        {' · '}
                        {plural(summary.overflowSpecIds.length, 'spec')} need more secondary requirements than {summary.overflowSpecIds.length === 1 ? 'it has' : 'they have'}
                    </span>
                )}
            </span>
            <span className="flex-1" />
            <Button size="sm" variant="ghost" className="rounded-sm" onClick={onDiscard} disabled={saving}>
                Discard
            </Button>
            <Button size="sm" className="rounded-sm" onClick={onSave} disabled={saving || blocked}>
                {saving ? 'Saving…' : `Save ${code} requirements`}
            </Button>
        </div>
    );
}
