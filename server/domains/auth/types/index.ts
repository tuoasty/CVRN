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
    SetPasswordInput,
    AuthCallbackInput,
} from "./schemas";

export {
    LoginSchema,
    SetPasswordSchema,
    AuthCallbackSchema,
} from "./schemas";
