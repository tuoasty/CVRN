export default function Loading() {
    return (
        <div className="mx-auto max-w-[1400px] px-7 pb-20 pt-6">
            <div className="mb-1 h-8 w-72 animate-pulse bg-muted/50" />
            <div className="mb-4 mt-2 h-4 w-full max-w-[74ch] animate-pulse bg-muted/40" />
            <div className="mb-4 h-8 w-64 animate-pulse bg-muted/40" />
            <div className="h-[38px] w-96 animate-pulse bg-muted/40" />

            <div className="pt-5">
                <div className="mb-3.5 mt-1.5 h-6 w-40 animate-pulse bg-muted/50" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 min-[900px]:grid-cols-3 min-[1180px]:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="panel h-[340px] animate-pulse bg-muted/30" />
                    ))}
                </div>
            </div>
        </div>
    );
}
