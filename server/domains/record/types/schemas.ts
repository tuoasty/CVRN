import {z} from "zod";

export const RecordsParamsSchema = z.object({
    region: z.string().trim().regex(/^[A-Za-z]{2,4}$/).transform(s => s.toLowerCase()).optional(),
    season: z.string().trim().regex(/^[1-9]\d{0,2}$/).transform(Number).optional(),
});

export type RecordsParams = z.infer<typeof RecordsParamsSchema>;
