import {z} from "zod";
import {extractSheetId} from "@/server/utils/googleSheets";

export const SaveMatchSheetConfigSchema = z.object({
    matchId: z.string().uuid(),
    sheetId: z.string().min(1, "Sheet ID required").transform(extractSheetId),
});

export type SaveMatchSheetConfigInput = z.infer<typeof SaveMatchSheetConfigSchema>;
