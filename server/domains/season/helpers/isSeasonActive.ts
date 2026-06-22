import { Season } from "@/shared/types/db";

export function isSeasonActive(season:Season): boolean {
  return !season.end_date || new Date(season.end_date) > new Date()
}