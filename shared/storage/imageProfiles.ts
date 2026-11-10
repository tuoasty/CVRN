export interface ImageProfile {
    maxFileSize: number;
    maxDimension: number;
    trimPadding: boolean;
}

export const IMAGE_PROFILES = {
    logo: { maxFileSize: 2 * 1024 * 1024, maxDimension: 256, trimPadding: true },
    specPhoto: { maxFileSize: 2.5 * 1024 * 1024, maxDimension: 800, trimPadding: false },
} as const satisfies Record<string, ImageProfile>;
