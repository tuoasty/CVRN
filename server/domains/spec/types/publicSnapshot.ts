export type SpecDifficultyTier = 1 | 2 | 3 | 4;

export interface PublicRequirement {
    statKey: string;
    label: string;
    tier: SpecDifficultyTier | null;
}

export interface PublicParticipation {
    statKey: string;
    label: string;
    value: number;
}

export interface PublicSpec {
    id: string;
    name: string;
    position: string;
    heightInches: number;
    stars: number;
    secondaryRequired: number;
    participation: PublicParticipation[];
    main: PublicRequirement[];
    secondary: PublicRequirement[];
}

export interface SpecSnapshotPayload {
    generatedAt: string;
    tierCount: number;
    setsFloorByStar: Record<number, number>;
    specs: PublicSpec[];
}
