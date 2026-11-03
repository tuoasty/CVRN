import { Season } from "@/shared/types/db";

export function isSeasonActiveAt(season: Pick<Season, "end_date">, now: Date): boolean {
  return !season.end_date || new Date(season.end_date) > now
}

export function isSeasonActive(season: Pick<Season, "end_date">): boolean {
  return isSeasonActiveAt(season, new Date())
}
