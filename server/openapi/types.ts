export type JsonSchema = Record<string, unknown>;

export type HttpMethod = "get" | "put" | "post" | "delete" | "patch";

export interface OpenApiParameter {
    name: string;
    in: "path" | "query" | "header";
    required: boolean;
    description?: string;
    schema: JsonSchema;
    example?: unknown;
}

export interface OpenApiMediaType {
    schema: JsonSchema;
    example?: unknown;
}

export interface OpenApiResponse {
    description: string;
    content?: Record<string, OpenApiMediaType>;
}

export interface OpenApiRequestBody {
    required: boolean;
    content: Record<string, OpenApiMediaType>;
}

export interface OpenApiOperation {
    tags: string[];
    summary: string;
    description?: string;
    operationId: string;
    security: Record<string, string[]>[];
    parameters?: OpenApiParameter[];
    requestBody?: OpenApiRequestBody;
    responses: Record<string, OpenApiResponse>;
}

export type OpenApiPaths = Record<string, Partial<Record<HttpMethod, OpenApiOperation>>>;

export interface OpenApiSecurityScheme {
    type: "http";
    scheme: "bearer";
    description: string;
}

export interface OpenApiDocument {
    openapi: "3.1.0";
    info: { title: string; version: string; description: string };
    servers: { url: string }[];
    tags: { name: string; description: string }[];
    components: { securitySchemes: Record<string, OpenApiSecurityScheme> };
    paths: OpenApiPaths;
}
