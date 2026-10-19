export interface ImageProfile {
    maxFileSize: number;
    maxDimension: number;
}

export const IMAGE_PROFILES = {
    logo: { maxFileSize: 2 * 1024 * 1024, maxDimension: 256 },
    specPhoto: { maxFileSize: 2.5 * 1024 * 1024, maxDimension: 800 },
} as const satisfies Record<string, ImageProfile>;
