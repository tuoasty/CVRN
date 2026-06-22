import { Season } from "@/shared/types/db";

export function isSeasonActive(season:Pick<Season, "end_date">): boolean {
  return !season.end_date || new Date(season.end_date) > new Date()
}