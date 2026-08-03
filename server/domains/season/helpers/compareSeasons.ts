import { Season } from "@/shared/types/db";
import { isSeasonActive } from "./isSeasonActive";

export function compareSeasons(a: Season, b:Season): number {
  const rankA = rankOf(a);
  const rankB = rankOf(b);
  if(rankA !== rankB) return rankA - rankB;

  if(rankA !== 2) return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()

  return new Date(b.end_date!).getTime() - new Date(a.end_date!).getTime()
}

function rankOf(s: Season): number {
  if(isSeasonActive(s)){
    if(s.league_type === "main") return 0;
    return 1;
  }
  return 2;
}