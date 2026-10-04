'use client';

import {Suspense} from 'react';
import SpecCatalog from '@/app/features/spec/catalog/SpecCatalog';

export default function AdminSpecsPage() {
    return (
        <div className="admin-container">
            <div className="admin-section">
                <Suspense fallback={<div className="panel h-[560px] animate-pulse bg-muted/40" />}>
                    <SpecCatalog />
                </Suspense>
            </div>
        </div>
    );
}
