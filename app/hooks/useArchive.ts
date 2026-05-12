import useSWR, {mutate as globalMutate} from 'swr';
import {getArchiveAction} from '@/app/actions/season.actions';
import {ArchiveSeason} from '@/server/domains/season';

const ARCHIVE_TTL = 10 * 60 * 1000;

async function fetchArchive(): Promise<ArchiveSeason[]> {
    const result = await getArchiveAction();
    if (!result.ok) throw new Error(result.error.message);
    return result.value;
}

export function useArchive() {
    const {data, error, isLoading, mutate} = useSWR('archive', fetchArchive, {
        dedupingInterval: ARCHIVE_TTL,
        revalidateOnFocus: false,
    });

    return {
        archive: data ?? [],
        isLoading,
        error: error?.message ?? null,
        mutate,
    };
}

export function mutateArchive() {
    return globalMutate('archive');
}
