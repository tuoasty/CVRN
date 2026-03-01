import CreateMatchesForm from "@/app/features/matches/CreateMatchesForm";

export default function CreateMatchesPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Create Matches</h1>
            <CreateMatchesForm />
        </div>
    );
}