export default function PublicLoading() {
    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
    );
}