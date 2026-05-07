import {DBClient, SheetConfig} from "@/shared/types/db";
import {Err, Ok, Result} from "@/shared/types/result";
import {serializeError} from "@/server/utils/serializeableError";

type InsertSheetConfigDto = {
    seasonId: string;
    sheetId: string;
    tabName: string;
    sheetType: string;
    headerRow?: number;
    blockHeight?: number;
    blockStride?: number;
    isActive?: boolean;
};

type UpdateSheetConfigDto = {
    sheetId?: string;
    tabName?: string;
    sheetType?: string;
    headerRow?: number;
    blockHeight?: number;
    blockStride?: number;
    isActive?: boolean;
};

export async function findAllSheetConfigs(supabase: DBClient): Promise<Result<SheetConfig[]>> {
    const {data, error} = await supabase
        .from("sheet_configs")
        .select("*")
        .order("created_at", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findActiveSheetConfigs(supabase: DBClient): Promise<Result<SheetConfig[]>> {
    const {data, error} = await supabase
        .from("sheet_configs")
        .select("*")
        .eq("is_active", true)
        .order("created_at", {ascending: true});
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data ?? []);
}

export async function findSheetConfigById(supabase: DBClient, id: string): Promise<Result<SheetConfig | null>> {
    const {data, error} = await supabase
        .from("sheet_configs")
        .select("*")
        .eq("id", id)
        .maybeSingle();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function insertSheetConfig(supabase: DBClient, dto: InsertSheetConfigDto): Promise<Result<SheetConfig>> {
    const {data, error} = await supabase
        .from("sheet_configs")
        .insert({
            season_id: dto.seasonId,
            sheet_id: dto.sheetId,
            tab_name: dto.tabName,
            sheet_type: dto.sheetType,
            ...(dto.headerRow !== undefined && {header_row: dto.headerRow}),
            ...(dto.blockHeight !== undefined && {block_height: dto.blockHeight}),
            ...(dto.blockStride !== undefined && {block_stride: dto.blockStride}),
            ...(dto.isActive !== undefined && {is_active: dto.isActive}),
        })
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function updateSheetConfig(supabase: DBClient, id: string, dto: UpdateSheetConfigDto): Promise<Result<SheetConfig>> {
    const payload: Record<string, unknown> = {updated_at: new Date().toISOString()};
    if (dto.sheetId !== undefined) payload.sheet_id = dto.sheetId;
    if (dto.tabName !== undefined) payload.tab_name = dto.tabName;
    if (dto.sheetType !== undefined) payload.sheet_type = dto.sheetType;
    if (dto.headerRow !== undefined) payload.header_row = dto.headerRow;
    if (dto.blockHeight !== undefined) payload.block_height = dto.blockHeight;
    if (dto.blockStride !== undefined) payload.block_stride = dto.blockStride;
    if (dto.isActive !== undefined) payload.is_active = dto.isActive;

    const {data, error} = await supabase
        .from("sheet_configs")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(data);
}

export async function deleteSheetConfig(supabase: DBClient, id: string): Promise<Result<true>> {
    const {error} = await supabase.from("sheet_configs").delete().eq("id", id);
    if (error) return Err(serializeError(error, "DB_ERROR"));
    return Ok(true);
}
