// Standings ordering method, stored on regions.standing_method.
//   'lvr'                  — LVR rating (default)
//   'points'               — base points (win + sets) + winner point-margin bonus
//   'points_without_bonus' — base points only; hidden tiebreak on most-recent-match point differential
export type StandingMethod = "lvr" | "points" | "points_without_bonus";
