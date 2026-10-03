import {z} from "zod";
import {isSpecStatKey} from "./statKeys";

export const SpecRequirementSchema = z.object({
    tier: z.enum(["main", "secondary"]),
    statKey: z.string().refine(isSpecStatKey, {
        message: "Not a stat a requirement can threshold",
    }),
    minValue: z.number().finite().nullable(),
});

export const SpecPositionSchema = z.enum(["OUT", "OPP", "MID", "SET", "LIB"]);

export const SaveSpecIdentitySchema = z.object({
    id: z.string().uuid().optional(),
    name: z.string().trim().min(1, "Name required").max(80),
    stars: z.number().int().min(3).max(5),
    position: SpecPositionSchema,
    height: z.number().int().min(48).max(96),
});

export const RegionSpecRequirementsSchema = z
    .object({
        specId: z.string().uuid(),
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
            message: "Secondary requirement count is higher than the number of secondary requirements, so nobody could qualify",
            path: ["secondaryRequired"],
        }
    );

export const SaveRegionRequirementsSchema = z
    .object({
        regionId: z.string().uuid(),
        specs: z.array(RegionSpecRequirementsSchema).min(1),
    })
    .refine(
        s => new Set(s.specs.map(x => x.specId)).size === s.specs.length,
        {message: "A spec can only appear once per save", path: ["specs"]}
    );

const SpecFileReqMapSchema = z.record(z.string(), z.number().finite().nullable());

export const SpecFileEntrySchema = z
    .object({
        spec_name: z.string().min(1),
        stars: z.number().int(),
        position: z.string().min(1),
        secondary_required: z.number().int().min(0),
        main_reqs: SpecFileReqMapSchema,
        sub_reqs: SpecFileReqMapSchema,
    })
    .strict();

export const SpecImportFileSchema = z
    .object({
        version: z.literal(1),
        exportedAt: z.string().optional(),
        specs: z.array(SpecFileEntrySchema),
    })
    .strict();

export const ExportSpecRequirementsSchema = z.object({
    regionId: z.string().uuid(),
    statsOnly: z.boolean(),
});

export const ImportSpecRequirementsSchema = z.object({
    regionId: z.string().uuid(),
    file: z.unknown(),
    dryRun: z.boolean(),
});

export const SpecQualificationSchema = z.object({
    seasonId: z.string().uuid(),
});

const bonusValue = z.number().finite().min(-1).max(3);

export const BonusScopeSchema = z.object({
    count: z.boolean(),
    per_set: z.boolean(),
    pct: z.boolean(),
});

export const PlacementBonusConfigSchema = z.object({
    upperFinalist: bonusValue,
    ladder: z.array(bonusValue).length(8),
    outside: bonusValue,
    scope: BonusScopeSchema,
});

export const SavePlacementBonusSchema = z.object({
    regionId: z.string().uuid(),
    config: PlacementBonusConfigSchema,
});

export const AwardSpecWinnerSchema = z.object({
    seasonId: z.string().uuid(),
    specId: z.string().uuid(),
    playerId: z.string().uuid(),
    starsAwarded: z.number().int().min(0).max(5),
});

export const DeleteSpecWinnerSchema = z.object({
    id: z.string().uuid(),
});

export type SpecRequirementInput = z.infer<typeof SpecRequirementSchema>;
export type SpecPositionInput = z.infer<typeof SpecPositionSchema>;
export type SaveSpecIdentityInput = z.infer<typeof SaveSpecIdentitySchema>;
export type RegionSpecRequirementsInput = z.infer<typeof RegionSpecRequirementsSchema>;
export type SaveRegionRequirementsInput = z.infer<typeof SaveRegionRequirementsSchema>;
export type ExportSpecRequirementsInput = z.infer<typeof ExportSpecRequirementsSchema>;
export type ImportSpecRequirementsInput = z.infer<typeof ImportSpecRequirementsSchema>;
export type SpecQualificationInput = z.infer<typeof SpecQualificationSchema>;
export type SavePlacementBonusInput = z.infer<typeof SavePlacementBonusSchema>;
export type AwardSpecWinnerInput = z.infer<typeof AwardSpecWinnerSchema>;
export type DeleteSpecWinnerInput = z.infer<typeof DeleteSpecWinnerSchema>;
