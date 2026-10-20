'use client';

import Link from 'next/link';
import {cn} from '@/lib/utils';
import {Button} from '@/app/components/ui/button';
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/app/components/ui/tooltip';
import {Region} from '@/shared/types/db';
import {CatalogView} from './catalogParams';

interface Props {
    regions: Region[];
    regionCode: string;
    onRegion: (code: string) => void;
    view: CatalogView;
    onView: (view: CatalogView) => void;
    onNewSpec: () => void;
    onExport: () => void;
    onImport: () => void;
    onPublish: () => void;
    onUnpublish: () => void;
    heightsOpen: boolean;
    onToggleHeights: () => void;
    exporting: boolean;
    publishing: boolean;
    unpublishing: boolean;
    unsetSpecNames: string[];
    dirtyChanges: number;
}

const VIEWS: {value: CatalogView; label: string}[] = [
    {value: 'spec', label: 'By spec'},
    {value: 'stat', label: 'By stat'},
];

export default function SpecCatalogHeader({
    regions,
    regionCode,
    onRegion,
    view,
    onView,
    onNewSpec,
    onExport,
    onImport,
    onPublish,
    onUnpublish,
    heightsOpen,
    onToggleHeights,
    exporting,
    publishing,
    unpublishing,
    unsetSpecNames,
    dirtyChanges,
}: Props) {
    const code = regionCode.toUpperCase();
    return (
        <div className="flex flex-wrap items-center gap-3 pb-4 border-b border-border">
            <h1 className="text-xl font-semibold tracking-tight">Specs</h1>
            <div className="inline-flex border border-border" role="group" aria-label="Region">
                {regions.map(r => {
                    const here = r.code.toLowerCase() === regionCode;
                    return (
                        <button
                            key={r.id}
                            type="button"
                            aria-pressed={here}
                            onClick={() => !here && onRegion(r.code)}
                            className={cn(
                                'h-8 px-3 text-sm border-r border-border last:border-r-0 transition-colors',
                                here
                                    ? 'bg-secondary text-secondary-foreground font-semibold'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}
                        >
                            {r.code.toUpperCase()}
                        </button>
                    );
                })}
            </div>
            <div className="flex gap-4 ml-4" role="tablist">
                {VIEWS.map(v => (
                    <button
                        key={v.value}
                        type="button"
                        role="tab"
                        aria-selected={view === v.value}
                        onClick={() => view !== v.value && onView(v.value)}
                        className={cn(
                            'text-sm py-1.5 border-b-2 transition-colors',
                            view === v.value
                                ? 'text-foreground border-foreground'
                                : 'text-muted-foreground border-transparent hover:text-foreground'
                        )}
                    >
                        {v.label}
                    </button>
                ))}
            </div>
            <div className="flex-1" />
            <Button size="sm" variant="outline" className="rounded-sm" onClick={onNewSpec}>
                + New spec
            </Button>
            <Button size="sm" variant="ghost" className="rounded-sm text-muted-foreground" onClick={onExport} disabled={exporting}>
                {exporting ? 'Exporting…' : 'Export'}
            </Button>
            <Button size="sm" variant="ghost" className="rounded-sm text-muted-foreground" onClick={onImport}>
                Import
            </Button>
            <Button
                size="sm"
                variant="ghost"
                aria-expanded={heightsOpen}
                className={cn('rounded-sm', heightsOpen ? 'text-foreground' : 'text-muted-foreground')}
                onClick={onToggleHeights}
            >
                Height ranges
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-sm">
                <Link href="/admin/specs/qualify">Calibrate</Link>
            </Button>
            <Button
                size="sm"
                variant="ghost"
                className="rounded-sm text-muted-foreground"
                onClick={onUnpublish}
                disabled={unpublishing}
            >
                Unpublish {code}
            </Button>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <span tabIndex={dirtyChanges > 0 ? 0 : -1}>
                            <Button
                                size="sm"
                                className="rounded-sm"
                                onClick={onPublish}
                                disabled={publishing || dirtyChanges > 0}
                            >
                                {publishing ? 'Publishing…' : `Publish ${code}`}
                                {unsetSpecNames.length > 0 && (
                                    <span className="font-mono text-xs opacity-85">◌ {unsetSpecNames.length}</span>
                                )}
                            </Button>
                        </span>
                    </TooltipTrigger>
                    {(dirtyChanges > 0 || unsetSpecNames.length > 0) && (
                        <TooltipContent side="bottom" align="end" className="max-w-72">
                            {dirtyChanges > 0
                                ? `Save or discard your ${dirtyChanges} ${dirtyChanges === 1 ? 'change' : 'changes'} first`
                                : `${unsetSpecNames.length} ${unsetSpecNames.length === 1 ? "spec won't" : "specs won't"} publish because of unset thresholds: ${unsetSpecNames.join(', ')}`}
                        </TooltipContent>
                    )}
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
