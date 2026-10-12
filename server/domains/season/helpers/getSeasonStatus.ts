import { Season } from "@/shared/types/db";

export type SeasonStatus = "upcoming" | "active" | "ended";

export function getSeasonStatus(season: Pick<Season, "start_date" | "end_date">, now: Date = new Date()): SeasonStatus {
  if (season.end_date && new Date(season.end_date) <= now) return "ended";
  if (new Date(season.start_date) > now) return "upcoming";
  return "active";
}
