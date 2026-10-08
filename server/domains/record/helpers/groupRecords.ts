import {
    RECORD_CATEGORIES,
    RECORD_GRAINS,
    RECORD_SUBJECTS,
    TEAM_EXCLUDED_CATEGORIES,
    type RecordBook,
    type RecordCategoryGroup,
    type RecordEntry,
    type RecordSubject,
} from "../types";

function categoriesFor(subject: RecordSubject) {
    return subject === "team"
        ? RECORD_CATEGORIES.filter(c => !TEAM_EXCLUDED_CATEGORIES.includes(c.key))
        : RECORD_CATEGORIES;
}

export function groupRecords(entries: RecordEntry[]): RecordBook {
    const buckets = new Map<string, RecordEntry[]>();
    for (const entry of entries) {
        const key = `${entry.subject}|${entry.grain}|${entry.category}`;
        const bucket = buckets.get(key);
        if (bucket) bucket.push(entry);
        else buckets.set(key, [entry]);
    }

    const book = {} as RecordBook;
    for (const subject of RECORD_SUBJECTS) {
        book[subject] = {} as RecordBook[RecordSubject];
        for (const grain of RECORD_GRAINS) {
            const groups: RecordCategoryGroup[] = [];
            for (const {key, label} of categoriesFor(subject)) {
                const bucket = buckets.get(`${subject}|${grain}|${key}`);
                if (!bucket || bucket.length === 0) continue;
                const sorted = [...bucket].sort((a, b) => a.rowNum - b.rowNum);
                groups.push({
                    category: key,
                    label,
                    entries: sorted,
                    tiedBeyond: sorted[sorted.length - 1].tiedBeyond,
                });
            }
            book[subject][grain] = groups;
        }
    }
    return book;
}
