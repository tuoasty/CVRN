import {z} from "zod"

export const LoginSchema = z.object({
    email: z.email(),
    password: z.string().min(6),
})
export type LoginInput = z.infer<typeof LoginSchema>

export const AuthCallbackSchema = z.object({
    url: z.string().url(),
})
export type AuthCallbackInput = z.infer<typeof AuthCallbackSchema>
