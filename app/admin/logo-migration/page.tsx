import { getAllTeamsForMigration } from "@/app/actions/logoMigration.actions";
import LogoMigrationClient from "./LogoMigrationClient";

export default async function LogoMigrationPage() {
    const result = await getAllTeamsForMigration();
    if (!result.ok) {
        return (
            <div className="p-8 text-red-600">
                Failed to load teams: {result.error.message}
            </div>
        );
    }
    return <LogoMigrationClient teams={result.value} />;
}
