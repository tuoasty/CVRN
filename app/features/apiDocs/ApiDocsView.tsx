"use client";

import {useEffect, useRef, useState} from "react";
import "swagger-ui-dist/swagger-ui.css";
import "./apiDocs.css";
import type {OpenApiDocument} from "@/server/openapi/types";

type LoadState = "loading" | "ready" | "failed";

export function ApiDocsView({spec}: {spec: OpenApiDocument}) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [state, setState] = useState<LoadState>("loading");

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return;
        let cancelled = false;
        import("swagger-ui-dist/swagger-ui-bundle.js")
            .then(({default: SwaggerUIBundle}) => {
                if (cancelled) return;
                SwaggerUIBundle({
                    domNode: node,
                    spec,
                    supportedSubmitMethods: [],
                    docExpansion: "list",
                    defaultModelsExpandDepth: -1,
                    deepLinking: true,
                    onComplete: () => {
                        if (!cancelled) setState("ready");
                    },
                });
            })
            .catch(() => {
                if (!cancelled) setState("failed");
            });
        return () => {
            cancelled = true;
            node.replaceChildren();
        };
    }, [spec]);

    return (
        <div className="page-wide py-6">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Game API</h1>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                Endpoints the Roblox game server calls, with request formats and example responses. Every request sends{" "}
                <code className="font-mono text-foreground">Authorization: Bearer &lt;secret&gt;</code> and must come from the game server, never a client script.
            </p>
            {state === "loading" && <p className="mt-8 text-sm text-muted-foreground">Loading endpoints…</p>}
            {state === "failed" && <p className="mt-8 text-sm text-destructive">The API docs failed to load. Reload the page to try again.</p>}
            <div ref={containerRef} className="api-docs mt-6" />
        </div>
    );
}
