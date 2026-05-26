import {z} from "zod";

export const SaveMatchSheetConfigSchema = z.object({
    matchId: z.string().uuid(),
    sheetId: z.string().min(1, "Sheet ID required"),
});

export type SaveMatchSheetConfigInput = z.infer<typeof SaveMatchSheetConfigSchema>;
