'use client';

import {useState} from 'react';
import {deleteSpecSnapshotAction, generateSpecSnapshotAction} from '@/app/actions/spec.actions';
import {exportSpecRequirements} from '@/app/hooks/useSpecs';
import {toast} from '@/app/utils/toast';
import {clientLogger} from '@/app/utils/clientLogger';
import {listWithMore} from './transfer';

export function useSpecPublishing(regionId: string | null, regionCode: string) {
    const code = regionCode.toUpperCase();
    const [exporting, setExporting] = useState(false);
    const [publishing, setPublishing] = useState(false);
    const [unpublishing, setUnpublishing] = useState(false);

    const exportRegion = async () => {
        if (!regionId) return;
        setExporting(true);
        try {
            const result = await exportSpecRequirements(regionId);
            if (!result.ok) {
                toast.error(`Failed to export ${code}`, result.error.message);
                return;
            }
            const blob = new Blob([JSON.stringify(result.value.file, null, 2)], {type: 'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = result.value.filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            clientLogger.error('useSpecPublishing', 'Export failed', {error: err});
            toast.error('Something went wrong');
        } finally {
            setExporting(false);
        }
    };

    const publish = async () => {
        if (!regionId) return;
        setPublishing(true);
        try {
            const result = await generateSpecSnapshotAction(regionId);
            if (!result.ok) {
                toast.error(`Nothing published for ${code}`, result.error.message);
                return;
            }
            const {specCount, skippedSpecs} = result.value;
            if (skippedSpecs.length > 0) {
                toast.warning(
                    `Published ${code} · ${skippedSpecs.length} skipped`,
                    `${specCount} specs live. Skipped for unset thresholds: ${listWithMore(skippedSpecs)}.`
                );
            } else {
                toast.success(`Published ${code}`, `${specCount} specs live on the public page.`);
            }
        } catch (err) {
            clientLogger.error('useSpecPublishing', 'Publish failed', {error: err});
            toast.error('Something went wrong');
        } finally {
            setPublishing(false);
        }
    };

    const unpublish = async (): Promise<boolean> => {
        if (!regionId) return false;
        setUnpublishing(true);
        try {
            const result = await deleteSpecSnapshotAction(regionId);
            if (!result.ok) {
                toast.error(`Failed to unpublish ${code}`, result.error.message);
                return false;
            }
            toast.success(`Unpublished ${code}`, `${code} no longer appears on the public page.`);
            return true;
        } catch (err) {
            clientLogger.error('useSpecPublishing', 'Unpublish failed', {error: err});
            toast.error('Something went wrong');
            return false;
        } finally {
            setUnpublishing(false);
        }
    };

    return {exportRegion, publish, unpublish, exporting, publishing, unpublishing};
}
