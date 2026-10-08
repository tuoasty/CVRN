import type {RecordScope} from "../types";

export function scopeKeyFor(scope: RecordScope): string {
    switch (scope.kind) {
        case "all":
            return "all";
        case "region":
            return `r:${scope.regionId}`;
        case "season":
            return `s:${scope.seasonId}`;
    }
}
