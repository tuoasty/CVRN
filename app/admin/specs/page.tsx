'use client';

import {useState} from 'react';
import Link from 'next/link';
import {Award, Plus, SlidersHorizontal} from 'lucide-react';
import {Button} from '@/app/components/ui/button';
import PositionRail from '@/app/features/spec/PositionRail';
import SpecCard from '@/app/features/spec/SpecCard';
import SpecEditPane from '@/app/features/spec/SpecEditPane';
import {useSpecs} from '@/app/hooks/useSpecs';
import {SpecPosition, positionLabel} from '@/server/domains/spec/types';

export default function AdminSpecsPage() {
    const {specs, isLoading, error} = useSpecs();

    const [active, setActive] = useState<SpecPosition | 'ALL'>('ALL');
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);

    const visibleSpecs = active === 'ALL' ? specs : specs.filter(s => s.position === active);
    const selectedSpec = specs.find(s => s.id === selectedId) ?? null;

    const selectSpec = (id: string) => {
        setSelectedId(id);
        setCreating(false);
    };

    const startCreate = () => {
        setCreating(true);
        setSelectedId(null);
    };

    const handleSaved = () => {
        setCreating(false);
    };

    const handleDeleted = () => {
        setSelectedId(null);
        setCreating(false);
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
                        <Button onClick={startCreate} className="rounded-sm gap-1">
                            <Plus className="h-4 w-4" />
                            New Spec
                        </Button>
                        <Button asChild variant="outline" className="rounded-sm gap-1">
                            <Link href="/admin/specs/qualify">
                                <SlidersHorizontal className="h-4 w-4" />
                                Calibrate
                            </Link>
                        </Button>
                    </div>
                </div>

                {error ? (
                    <div className="panel p-6 mt-6 text-center">
                        <p className="text-destructive text-sm">{error}</p>
                    </div>
                ) : (
                    <div className="mt-6 grid grid-cols-[minmax(96px,10%)_1fr_minmax(300px,30%)] border border-border rounded-sm overflow-hidden min-h-[560px]">
                        <div className="border-r border-border bg-muted/30 overflow-y-auto">
                            <PositionRail specs={specs} active={active} onSelect={setActive} />
                        </div>

                        <div className="grid grid-cols-3 gap-2 p-3 content-start overflow-y-auto">
                            {isLoading ? (
                                [...Array(3)].map((_, i) => (
                                    <div key={i} className="panel w-full h-48 animate-pulse bg-muted/40" />
                                ))
                            ) : visibleSpecs.length === 0 ? (
                                <div className="col-span-3 text-center text-sm text-muted-foreground py-10">
                                    No specs in {active === 'ALL' ? 'the catalog' : positionLabel(active)} yet — use
                                    New Spec to add one.
                                </div>
                            ) : (
                                visibleSpecs.map(spec => (
                                    <SpecCard
                                        key={spec.id}
                                        spec={spec}
                                        selected={spec.id === selectedId && !creating}
                                        onClick={() => selectSpec(spec.id)}
                                    />
                                ))
                            )}
                        </div>

                        <div className="border-l border-border bg-muted/20 overflow-y-auto">
                            {creating ? (
                                <SpecEditPane spec={null} mode="create" onSaved={handleSaved} onDeleted={handleDeleted} />
                            ) : selectedSpec ? (
                                <SpecEditPane
                                    spec={selectedSpec}
                                    mode="edit"
                                    onSaved={handleSaved}
                                    onDeleted={handleDeleted}
                                />
                            ) : (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    Select a spec, or ＋ to create one.
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <p className="text-xs text-muted-foreground/70 mt-4">
                    Thresholds are admin-only — <span className="font-mono">spec_requirements</span> has
                    no public read policy.
                </p>
            </div>
        </div>
    );
}
