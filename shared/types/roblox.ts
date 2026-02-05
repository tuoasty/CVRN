export interface RobloxThumbnail {
    targetId: bigint,
    state: string,
    imageUrl: string,
    version: string,
}

export interface RobloxUser {
    requestedUsername: string,
    hasVerifiedBadge: boolean,
    id: bigint,
    name: string,
    displayName: string
}

export interface RobloxUserWithAvatar {
    requestedUsername: string;
    hasVerifiedBadge: boolean;
    id: bigint;
    name: string;
    displayName: string;
    avatarUrl: string;
}
