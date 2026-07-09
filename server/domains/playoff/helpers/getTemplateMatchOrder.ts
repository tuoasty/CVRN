import {Err, Ok, Result} from "@/shared/types/result";
import {SerializableError} from "@/server/utils/serializeableError";
import {PlayoffMatchTemplate} from "../types";
import {templates} from "./playoffTemplates";

type Mark = "visiting" | "done";

// The order playoff matches must be resolved in: a topological sort of the
// template's dependency DAG. Edges come only from `{ type: "match" }` slots;
// `{ type: "seed" }` slots are leaves. A slot's `result` ("winner" | "loser")
// is irrelevant here — BR depends on GF twice, and that doubled edge is free.
//
// Do not substitute `display_order` or round names: display_order flattens
// upper then lower, which puts GF ahead of its own LF feeder.

function dependenciesOf(match: PlayoffMatchTemplate): string[] {
    return [match.home, match.away].flatMap(slot =>
        slot.type === "match" ? [slot.code] : []
    );
}

export function getTemplateMatchOrder(templateKey: string): Result<string[]> {
    const template = templates[templateKey as keyof typeof templates];
    if (!template) {
        return Err({
            message: `Unknown playoff template "${templateKey}"`,
            code: "VALIDATION_ERROR",
        });
    }

    const matches = [...template.upper, ...template.lower].flatMap(group => group.matches);

    const matchesByCode = new Map<string, PlayoffMatchTemplate>();
    for (const match of matches) {
        if (matchesByCode.has(match.code)) {
            return Err({
                message: `Playoff template "${templateKey}" declares match code "${match.code}" more than once`,
                code: "VALIDATION_ERROR",
            });
        }
        matchesByCode.set(match.code, match);
    }

    const order: string[] = [];
    const marks = new Map<string, Mark>();
    let failure: SerializableError | null = null;

    // Post-order DFS. Returns false on a malformed template, leaving the reason
    // in `failure` — threading a Result through the recursion buys nothing.
    function resolve(code: string): boolean {
        const mark = marks.get(code);
        if (mark === "done") return true;
        if (mark === "visiting") {
            failure = {
                message: `Playoff template "${templateKey}" has a dependency cycle at match "${code}"`,
                code: "VALIDATION_ERROR",
            };
            return false;
        }

        const match = matchesByCode.get(code);
        if (!match) {
            failure = {
                message: `Playoff template "${templateKey}" references unknown match code "${code}"`,
                code: "VALIDATION_ERROR",
            };
            return false;
        }

        marks.set(code, "visiting");
        for (const dependency of dependenciesOf(match)) {
            if (!resolve(dependency)) return false;
        }
        marks.set(code, "done");
        order.push(code);
        return true;
    }

    // Every code is a potential root: 16q and 12q-8pi each have two sinks (GF, 3RD).
    // Iterating in template file order keeps the output deterministic.
    for (const match of matches) {
        if (!resolve(match.code)) {
            return Err(
                failure ?? {
                    message: `Playoff template "${templateKey}" is malformed`,
                    code: "VALIDATION_ERROR",
                }
            );
        }
    }

    return Ok(order);
}
