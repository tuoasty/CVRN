declare module "swagger-ui-dist/swagger-ui-bundle.js" {
    interface SwaggerUIBundleOptions {
        domNode: HTMLElement;
        spec: object;
        supportedSubmitMethods?: string[];
        docExpansion?: "list" | "full" | "none";
        defaultModelsExpandDepth?: number;
        deepLinking?: boolean;
        onComplete?: () => void;
    }

    const SwaggerUIBundle: (options: SwaggerUIBundleOptions) => unknown;
    export default SwaggerUIBundle;
}
