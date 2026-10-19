export default function SpecsLoading() {
    return (
        <div>
            <div className="mb-9 h-7 w-80 animate-pulse bg-muted/50 motion-reduce:animate-none" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {[...Array(12)].map((_, i) => (
                    <div key={i}>
                        <div className="aspect-[4/5] animate-pulse bg-muted/40 motion-reduce:animate-none" />
                        <div className="mt-2 h-4 w-3/4 animate-pulse bg-muted/40 motion-reduce:animate-none" />
                        <div className="mt-1.5 h-3 w-1/2 animate-pulse bg-muted/30 motion-reduce:animate-none" />
                    </div>
                ))}
            </div>
        </div>
    )
}
