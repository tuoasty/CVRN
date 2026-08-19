'use client';

import React, {useState, useEffect} from 'react';
import {Button} from '@/app/components/ui/button';
import {Input} from '@/app/components/ui/input';
import {Label} from '@/app/components/ui/label';
import {Dialog, DialogContent, DialogHeader, DialogTitle} from '@/app/components/ui/dialog';
import {saveMatchSheetConfig} from '@/app/hooks/useMatchSheetConfigs';
import {PlayoffMatchStatRow} from '@/server/domains/matchStats';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';

interface Props {
    match: PlayoffMatchStatRow | null;
    teamName: (id: string | null) => string;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export default function AddMatchStatDialog({match, teamName, onOpenChange, onSuccess}: Props) {
    const [sheetId, setSheetId] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (match) {
            setSheetId('');
            setSaving(false);
        }
    }, [match]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!match) return;
        if (!sheetId.trim()) {
            toast.error('Sheet URL or ID is required');
            return;
        }
        setSaving(true);
        try {
            const result = await saveMatchSheetConfig({matchId: match.matchId, sheetId: sheetId.trim()});
            if (!result.ok) {
                clientLogger.error('AddMatchStatDialog', 'Failed to save config', {error: result.error});
                toast.error('Failed to save', result.error.message);
                return;
            }
            toast.success('Stats sheet added');
            onOpenChange(false);
            onSuccess?.();
        } catch (err) {
            clientLogger.error('AddMatchStatDialog', 'Exception saving config', {err});
            toast.error('Something went wrong');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={!!match} onOpenChange={onOpenChange}>
            <DialogContent className="w-[calc(100%-2rem)] !max-w-lg rounded-sm" aria-describedby={undefined}>
                <DialogHeader>
                    <DialogTitle>Add Stats Sheet</DialogTitle>
                </DialogHeader>
                {match && (
                    <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                        <div className="space-y-1">
                            <Label>Match</Label>
                            <p className="text-sm font-medium">
                                {(match.matchCode ?? match.round ?? 'Match')} — {teamName(match.homeTeamId)} vs {teamName(match.awayTeamId)}
                            </p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="stat-sheet-id">Sheet URL or ID</Label>
                            <Input
                                id="stat-sheet-id"
                                value={sheetId}
                                onChange={e => setSheetId(e.target.value)}
                                disabled={saving}
                                className="rounded-sm font-mono text-sm"
                                placeholder="https://docs.google.com/spreadsheets/d/…"
                                autoFocus
                            />
                            <p className="text-xs text-muted-foreground">Paste the full Google Sheet link or just the ID.</p>
                        </div>
                        <div className="flex gap-3 pt-1">
                            <Button type="submit" disabled={saving} className="rounded-sm">
                                {saving ? 'Saving...' : 'Add'}
                            </Button>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="rounded-sm">
                                Cancel
                            </Button>
                        </div>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
