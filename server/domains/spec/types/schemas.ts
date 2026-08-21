import {z} from "zod";
import {isSpecStatKey} from "./statKeys";

export const SpecRequirementSchema = z.object({
    tier: z.enum(["main", "secondary"]),
    statKey: z.string().refine(isSpecStatKey, {
        message: "Not a stat a requirement can threshold",
    }),
    minValue: z.number().finite(),
});

export const SaveSpecSchema = z
    .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1, "Name required").max(80),
        stars: z.number().int().min(3).max(5),
        position: z.enum(["OUT", "OPP", "MID", "SET", "LIB"]),
        height: z.number().int().min(48).max(96),
        secondaryRequired: z.number().int().min(0),
        requirements: z.array(SpecRequirementSchema),
    })
    .refine(
        s => new Set(s.requirements.map(r => r.statKey)).size === s.requirements.length,
        {message: "A stat can only be thresholded once per spec", path: ["requirements"]}
    )
    .refine(
        s => s.secondaryRequired <= s.requirements.filter(r => r.tier === "secondary").length,
        {
            message: "Secondary requirement count is higher than the number of secondary requirements — nobody could qualify",
            path: ["secondaryRequired"],
        }
    );

export const SpecQualificationSchema = z.object({
    seasonId: z.string().uuid(),
});

export type SpecRequirementInput = z.infer<typeof SpecRequirementSchema>;
export type SaveSpecInput = z.infer<typeof SaveSpecSchema>;
export type SpecQualificationInput = z.infer<typeof SpecQualificationSchema>;
