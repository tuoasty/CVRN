import { Ok, Result } from "@/shared/types/result";
import { PlayoffMatchTemplate, templates } from "../../playoff";

export default function getTemplateMatchOrder(
  templateKey: string,
): Result<string[]>{
    const template = templates[templateKey as keyof typeof templates];
    const matches = [
      ...template.upper.flatMap(round => round.matches),
      ...template.lower.flatMap(round => round.matches)
    ]
    const codeOrder:string[] = []

    const matchesByCode = new Map(matches.map(m => [m.code, m]))
    const visited = new Set<string>();

    function resolve(match:PlayoffMatchTemplate){
      if (visited.has(match.code)) return;

      visited.add(match.code)
      if(match.home.type === "match"){
        const dep = matchesByCode.get(match.home.code);
        if(dep) resolve(dep);
      }

      if(match.away.type === "match"){
        const dep = matchesByCode.get(match.away.code);
        if(dep) resolve(dep);
      }

      codeOrder.push(match.code)
    }

    matches.forEach(resolve)
    return Ok(codeOrder)
}
