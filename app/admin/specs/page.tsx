'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Award, Pencil, Plus, SlidersHorizontal, Star, Trash2} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/app/components/ui/alert-dialog';
import SpecFormDialog from '@/app/features/spec/SpecFormDialog';
import {useSpecs, deleteSpec} from '@/app/hooks/useSpecs';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';

import {SpecWithRequirements, specStatLabel, formatSpecStatValue, specStatMeta} from '@/server/domains/spec/types';

function StarRating({stars}: {stars: number}) {
    return (
        <span className="inline-flex items-center gap-0.5 tabular-nums" title={`${stars} star`}>
            <span className="font-mono text-sm">{stars}</span>
            <Star className="h-3.5 w-3.5 fill-current text-primary" />
        </span>
    );
}

function RequirementList({spec}: {spec: SpecWithRequirements}) {
    const main = spec.requirements.filter(r => r.tier === 'main');
    const secondary = spec.requirements.filter(r => r.tier === 'secondary');

    if (spec.requirements.length === 0) {
        return <span className="text-xs text-muted-foreground/60">No requirements set</span>;
    }

    const line = (r: SpecWithRequirements['requirements'][number]) => {
        const format = specStatMeta(r.stat_key)?.format ?? 'count';
        return `${specStatLabel(r.stat_key)} ≥ ${formatSpecStatValue(r.min_value, format)}`;
    };

    return (
        <div className="space-y-1.5">
            {main.length > 0 && (
                <div className="text-xs">
                    <span className="text-muted-foreground uppercase tracking-wide mr-2">Main</span>
                    <span className="font-mono tabular-nums">{main.map(line).join(' · ')}</span>
                </div>
            )}
            {secondary.length > 0 && (
                <div className="text-xs">
                    <span className="text-muted-foreground uppercase tracking-wide mr-2">
                        Secondary {spec.secondary_required}/{secondary.length}
                    </span>
                    <span className="font-mono tabular-nums">{secondary.map(line).join(' · ')}</span>
                </div>
            )}
        </div>
    );
}

export default function AdminSpecsPage() {
    const {specs, isLoading, error} = useSpecs();

    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<SpecWithRequirements | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<SpecWithRequirements | null>(null);
    const [deleting, setDeleting] = useState(false);

    const openNew = () => {
        setEditTarget(null);
        setFormOpen(true);
    };

    const openEdit = (spec: SpecWithRequirements) => {
        setEditTarget(spec);
        setFormOpen(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            const result = await deleteSpec(deleteTarget.id);
            if (!result.ok) {
                toast.error('Failed to delete', result.error.message);
                return;
            }
            toast.success('Spec deleted');
            setDeleteTarget(null);
        } catch (err) {
            clientLogger.error('AdminSpecsPage', 'Exception deleting spec', {err});
            toast.error('Something went wrong');
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-section">
                <div className="flex items-center gap-4 pb-6 border-b-2 border-primary/20">
                    <div className="flex items-center justify-center w-14 h-14 rounded-sm bg-primary/10 border border-primary/20">
                        <Award className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold uppercase tracking-wider">Specs</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            The spec catalog and the stat thresholds a player must clear to qualify
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Button asChild variant="outline" className="rounded-sm gap-1">
                            <Link href="/admin/specs/qualify">
                                <SlidersHorizontal className="h-4 w-4" />
                                Calibrate
                            </Link>
                        </Button>
                        <Button onClick={openNew} className="rounded-sm gap-1">
                            <Plus className="h-4 w-4" />
                            New Spec
                        </Button>
                    </div>
                </div>

                {error && (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-destructive text-sm">{error}</p>
                    </div>
                )}

                {!error && isLoading && (
                    <div className="panel overflow-x-auto mt-6">
                        <table className="table-dense">
                            <thead>
                                <tr>
                                    <th className="w-48">Spec</th>
                                    <th className="w-20">Stars</th>
                                    <th>Requirements</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[...Array(3)].map((_, i) => (
                                    <tr key={i}>
                                        {[...Array(3)].map((_, j) => (
                                            <td key={j}><div className="h-4 bg-muted/40 rounded animate-pulse" /></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!error && !isLoading && specs.length === 0 && (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-muted-foreground">No specs yet.</p>
                    </div>
                )}

                {!error && !isLoading && specs.length > 0 && (
                    <div className="panel overflow-x-auto mt-6">
                        <table className="table-dense">
                            <thead>
                                <tr>
                                    <th className="w-48">Spec</th>
                                    <th className="w-20">Stars</th>
                                    <th>Requirements</th>
                                    <th className="w-24">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {specs.map(spec => (
                                    <tr key={spec.id}>
                                        <td className="text-sm font-medium">{spec.name}</td>
                                        <td><StarRating stars={spec.stars} /></td>
                                        <td><RequirementList spec={spec} /></td>
                                        <td>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-sm"
                                                    onClick={() => openEdit(spec)}
                                                    aria-label={`Edit ${spec.name}`}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="rounded-sm text-destructive hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setDeleteTarget(spec)}
                                                    aria-label={`Delete ${spec.name}`}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <p className="text-xs text-muted-foreground/70 mt-4">
                    Thresholds are admin-only — <span className="font-mono">spec_requirements</span> has
                    no public read policy.
                </p>
            </div>

            <SpecFormDialog spec={editTarget} open={formOpen} onOpenChange={setFormOpen} />

            <AlertDialog
                open={!!deleteTarget}
                onOpenChange={open => { if (!open) setDeleteTarget(null); }}
            >
                <AlertDialogContent className="rounded-sm">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Spec</AlertDialogTitle>
                        <AlertDialogDescription>
                            Delete <strong>{deleteTarget?.name}</strong> and its{' '}
                            {deleteTarget?.requirements.length ?? 0} requirement
                            {deleteTarget?.requirements.length === 1 ? '' : 's'}? This cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-sm" disabled={deleting}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="rounded-sm bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={handleDelete}
                            disabled={deleting}
                        >
                            {deleting ? 'Deleting...' : 'Delete'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
