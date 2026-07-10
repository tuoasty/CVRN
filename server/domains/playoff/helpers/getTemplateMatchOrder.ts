import {Err, Ok, Result} from "@/shared/types/result";
import {SerializableError} from "@/server/utils/serializeableError";
import {PlayoffMatchTemplate} from "../types";
import {templates} from "./playoffTemplates";

type Mark = "visiting" | "done";

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
