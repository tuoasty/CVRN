import {z} from "zod";
import type {JsonSchema, OpenApiParameter, OpenApiRequestBody, OpenApiResponse} from "./types";

export function toJsonSchema(schema: z.ZodType, io: "input" | "output"): JsonSchema {
    const out: JsonSchema = {...z.toJSONSchema(schema, {io, target: "draft-2020-12"})};
    delete out.$schema;
    return out;
}

export function pathParam(name: string, schema: z.ZodType, description: string, example: string): OpenApiParameter {
    return {name, in: "path", required: true, description, schema: toJsonSchema(schema, "input"), example};
}

export function queryParam(name: string, schema: z.ZodType, description: string, example: string, required: boolean = true): OpenApiParameter {
    return {name, in: "query", required, description, schema: toJsonSchema(schema, "input"), example};
}

export function jsonResponse<T>(description: string, schema: z.ZodType<T>, example: T): OpenApiResponse {
    return {description, content: {"application/json": {schema: toJsonSchema(schema, "output"), example}}};
}

export function jsonRequestBody<T>(schema: z.ZodType<unknown, T>, example: T): OpenApiRequestBody {
    return {required: true, content: {"application/json": {schema: toJsonSchema(schema, "input"), example}}};
}

export const ApiErrorSchema = z.object({
    error: z.string(),
    code: z.string(),
    issues: z.array(z.object({
        field: z.string(),
        input: z.string().nullable(),
        message: z.string(),
    })).optional(),
});
export type ApiError = z.infer<typeof ApiErrorSchema>;

export function errorResponse(description: string, example: ApiError): OpenApiResponse {
    return jsonResponse(description, ApiErrorSchema, example);
}

export const UNAUTHORIZED_RESPONSE: OpenApiResponse = {
    description: "Missing or wrong bearer secret. The body is the plain text `Unauthorized`.",
    content: {"text/plain": {schema: {type: "string"}, example: "Unauthorized"}},
};
