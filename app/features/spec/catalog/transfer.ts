import {SpecImportIssue, SpecImportRegionDiff, SpecImportSpecDiff} from '@/server/domains/spec/types';
import {RegionState} from './catalogState';

export interface SpecDiffSummary {
    added: number;
    removed: number;
    tiers: number;
    values: number;
}

export function summarizeSpecDiff(spec: SpecImportSpecDiff): SpecDiffSummary {
    const summary: SpecDiffSummary = {added: 0, removed: 0, tiers: 0, values: 0};
    for (const c of spec.changes) {
        if (!c.before) summary.added++;
        else if (!c.after) summary.removed++;
        else {
            if (c.before.tier !== c.after.tier) summary.tiers++;
            if (c.before.value !== c.after.value) summary.values++;
        }
    }
    return summary;
}

const STATUS_ORDER = {cleared: 0, changed: 1, added: 2, unchanged: 3} as const;

export interface ImportPreviewModel {
    replaceCount: number;
    listed: SpecImportSpecDiff[];
    unchanged: SpecImportSpecDiff[];
}

export function importPreviewModel(diff: SpecImportRegionDiff): ImportPreviewModel {
    const sorted = [...diff.specs].sort(
        (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.specName.localeCompare(b.specName)
    );
    return {
        replaceCount: diff.counts.added + diff.counts.changed + diff.counts.cleared,
        listed: sorted.filter(s => s.status !== 'unchanged'),
        unchanged: sorted.filter(s => s.status === 'unchanged'),
    };
}

export interface IssueGroup {
    title: string;
    messages: string[];
}

export function groupImportIssues(issues: SpecImportIssue[]): IssueGroup[] {
    const fileMessages = issues.filter(i => i.spec === null).map(i => i.message);
    const bySpec = new Map<string, string[]>();
    for (const issue of issues) {
        if (issue.spec === null) continue;
        bySpec.set(issue.spec, [...(bySpec.get(issue.spec) ?? []), issue.message]);
    }
    const groups = [...bySpec.entries()].map(([title, messages]) => ({title, messages}));
    return fileMessages.length > 0 ? [{title: 'File', messages: fileMessages}, ...groups] : groups;
}

export function unpublishableSpecNames(specs: {id: string; name: string}[], saved: RegionState): string[] {
    return specs
        .filter(s => {
            const reqs = saved[s.id]?.requirements ?? [];
            return reqs.length > 0 && reqs.some(r => r.minValue === null);
        })
        .map(s => s.name)
        .sort((a, b) => a.localeCompare(b));
}

export function listWithMore(names: string[], max = 3): string {
    if (names.length <= max) return names.join(', ');
    return `${names.slice(0, max).join(', ')} and ${names.length - max} more`;
}
