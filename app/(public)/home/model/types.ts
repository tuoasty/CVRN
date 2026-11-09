export type SeasonPhase = "regular" | "playoffs" | "completed";
export type MatchupCategory = "setter" | "scorer" | "blocker" | "receiver";
export type LeaderCategory = "points" | "assists" | "blocks" | "receives";

export interface HomeTeam {
    id: string;
    name: string;
    logoUrl: string | null;
    logoBgRemoved: boolean;
    href: string | null;
}

export interface HeroImage {
    postId: string;
    imageUrl: string;
    ratio: number;
    authorName: string | null;
    href: string | null;
}

export interface StatCell {
    label: string;
    value: string;
}

export interface LeaderCell {
    playerId: string;
    name: string;
    username: string | null;
    avatarUrl: string | null;
    href: string | null;
    value: number;
    line: StatCell[];
}

export interface Matchup {
    category: MatchupCategory;
    label: string;
    home: LeaderCell | null;
    away: LeaderCell | null;
}

export interface FormEntry {
    result: "W" | "L";
    opponent: string;
    score: string;
    label: string;
}

export interface TapeSide {
    record: string;
    rank: number | null;
    rating: number | null;
    form: FormEntry[];
}

export interface Tape {
    ratingLabel: "LVR" | "Points";
    home: TapeSide | null;
    away: TapeSide | null;
    matchups: Matchup[];
    matchupUnit: "per set" | "this match";
}

export type HeroItem =
    | {
          kind: "match";
          key: string;
          image: HeroImage;
          label: string;
          whenLabel: string;
          isToday: boolean;
          isFinal: boolean;
          hasStats: boolean;
          home: HomeTeam;
          away: HomeTeam;
          homeSets: number | null;
          awaySets: number | null;
          setScores: { home: number; away: number }[];
          tape: Tape;
          href: string | null;
      }
    | {
          kind: "potw";
          key: string;
          image: HeroImage;
          label: string;
          player: { name: string; username: string; avatarUrl: string | null; href: string | null };
          team: HomeTeam | null;
          position: string | null;
          statsLabel: string | null;
          line: StatCell[];
      }
    | {
          kind: "totw";
          key: string;
          image: HeroImage;
          label: string;
          team: HomeTeam | null;
          record: string | null;
          rank: number | null;
          results: { key: string; result: "W" | "L"; opponent: string; score: string }[];
          leaders: { category: MatchupCategory; label: string; cell: LeaderCell | null }[];
      }
    | {
          kind: "champion";
          key: string;
          image: HeroImage | null;
          champion: HomeTeam;
          final: { opponent: HomeTeam; championSets: number; opponentSets: number } | null;
          podium: { place: number; team: HomeTeam }[];
          href: string | null;
      };

export interface ResultRow {
    matchId: string;
    dateLabel: string;
    home: HomeTeam;
    away: HomeTeam;
    homeSets: number | null;
    awaySets: number | null;
    hasStats: boolean;
    leaders: { category: LeaderCategory; label: string; cell: LeaderCell }[];
    href: string | null;
}

export interface UpcomingRow {
    matchId: string;
    time: string | null;
    home: HomeTeam;
    away: HomeTeam;
    hasGfx: boolean;
    href: string | null;
}

export interface UpcomingDay {
    key: string;
    label: string;
    isToday: boolean;
    rows: UpcomingRow[];
}

export interface UpcomingPage {
    key: string;
    label: string;
    days: UpcomingDay[];
}

export interface VodItem {
    postId: string;
    videoUrl: string;
    title: string;
    caption: string;
    matchHref: string | null;
}

export interface StandingRow {
    teamId: string;
    rank: number;
    team: HomeTeam;
    record: string;
    sets: string;
    rating: number;
    belowCutoff: boolean;
    cutoffAfter: boolean;
}

export interface LeaderColumn {
    category: LeaderCategory;
    label: string;
    entries: { rank: number; cell: LeaderCell; teamName: string | null }[];
}

export interface MediaTile {
    postId: string;
    imageUrl: string;
    ratio: number;
    caption: string;
    regionCode: string | null;
    href: string;
}

export interface NewsRow {
    slug: string;
    title: string;
    dateLabel: string;
    href: string;
}

export interface AwardRow {
    key: string;
    label: string;
    playerName: string;
    teamName: string | null;
    avatarUrl: string | null;
    href: string | null;
}

export interface HomeView {
    phase: SeasonPhase;
    hero: HeroItem[];
    results: { title: "Results" | "Final results"; rows: ResultRow[]; defaultExpandedId: string | null };
    upcoming: UpcomingPage[];
    awards: AwardRow[];
    vod: VodItem | null;
    standings: { title: "Standings" | "Final standings"; ratingLabel: "LVR" | "Points"; rows: StandingRow[]; href: string | null };
    leaders: LeaderColumn[];
    media: MediaTile[];
    news: NewsRow[];
}
