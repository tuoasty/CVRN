import {ApiDocsView} from "@/app/features/apiDocs/ApiDocsView";
import {buildOpenApiDocument} from "@/server/openapi/document";

export default function AdminGameApiPage() {
    return <ApiDocsView spec={buildOpenApiDocument()} />;
}
