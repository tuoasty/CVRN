export interface AuthUser {
    id: string;
    email: string;
    createdAt: string;
}

export interface AuthResponse {
    user: AuthUser;
    accessToken: string;
}

export type {
    LoginInput,
    AuthCallbackInput,
} from "./schemas";

export {
    LoginSchema,
    AuthCallbackSchema,
} from "./schemas";
