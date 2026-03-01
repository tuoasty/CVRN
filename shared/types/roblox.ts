export interface RobloxThumbnail {
    targetId: string,
    state: string,
    imageUrl: string,
    version: string,
}

export interface RobloxUser {
    requestedUsername: string,
    hasVerifiedBadge: boolean,
    id: string,
    name: string,
    displayName: string
}

export interface RobloxUserWithAvatar {
    requestedUsername: string;
    hasVerifiedBadge: boolean;
    id: string;
    name: string;
    displayName: string;
    avatarUrl: string;
}