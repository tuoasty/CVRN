import {z} from "zod";

export const RecordsParamsSchema = z
    .object({
        region: z.string().trim().regex(/^[A-Za-z]{2,4}$/).transform(s => s.toLowerCase()).optional(),
        season: z.string().trim().regex(/^[A-Za-z0-9-]{1,100}$/).transform(s => s.toLowerCase()).optional(),
    })
    .refine(p => !p.season || !!p.region, {message: "season requires region", path: ["season"]});

export type RecordsParams = z.infer<typeof RecordsParamsSchema>;
