'use client';

import Link from 'next/link';
import {cn} from '@/lib/utils';
import {Button} from '@/app/components/ui/button';
import {Region} from '@/shared/types/db';
import {CatalogView} from './catalogParams';

interface Props {
    regions: Region[];
    regionCode: string;
    onRegion: (code: string) => void;
    view: CatalogView;
    onView: (view: CatalogView) => void;
    onNewSpec: () => void;
}

const VIEWS: {value: CatalogView; label: string}[] = [
    {value: 'spec', label: 'By spec'},
    {value: 'stat', label: 'By stat'},
];

export default function SpecCatalogHeader({regions, regionCode, onRegion, view, onView, onNewSpec}: Props) {
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
            <Button size="sm" variant="ghost" className="rounded-sm text-muted-foreground" disabled>
                Export
            </Button>
            <Button size="sm" variant="ghost" className="rounded-sm text-muted-foreground" disabled>
                Import
            </Button>
            <Button asChild size="sm" variant="outline" className="rounded-sm">
                <Link href="/admin/specs/qualify">Calibrate</Link>
            </Button>
            <Button size="sm" className="rounded-sm" disabled>
                Publish {code}
            </Button>
        </div>
    );
}
