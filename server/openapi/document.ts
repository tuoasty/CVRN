import {SITE_URL} from "@/app/lib/siteUrl";
import {GAME_API_PATHS, GAME_API_SECURITY, GAME_API_TAG} from "./gameApi";
import type {OpenApiDocument} from "./types";

export function buildOpenApiDocument(): OpenApiDocument {
    return {
        openapi: "3.1.0",
        info: {
            title: "CVRN Game API",
            version: "1.0.0",
            description: "Endpoints the Roblox game server calls. Every request needs the bearer secret in the `Authorization` header. Call them from the game server only, never from a client script.",
        },
        servers: [{url: SITE_URL}],
        tags: [
            {name: GAME_API_TAG, description: "League data for in-game displays."},
        ],
        components: {
            securitySchemes: {
                [GAME_API_SECURITY]: {
                    type: "http",
                    scheme: "bearer",
                    description: "`Authorization: Bearer <ROBLOX_API_SECRET>`",
                },
            },
        },
        paths: {...GAME_API_PATHS},
    };
}
