export type OptionSelection<T> = {multi: false; value: T | null} | {multi: true; values: readonly T[]};

export function isAllSelected<T>(selection: OptionSelection<T>): boolean {
    return selection.multi ? selection.values.length === 0 : selection.value === null;
}

export function isOptionSelected<T>(selection: OptionSelection<T>, option: T): boolean {
    return selection.multi ? selection.values.includes(option) : selection.value === option;
}

export function toggleOptionValue<T>(values: readonly T[], option: T): T[] {
    return values.includes(option) ? values.filter(v => v !== option) : [...values, option];
}
