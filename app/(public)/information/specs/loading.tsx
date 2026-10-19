export default function SpecsLoading() {
    return (
        <div>
            <div className="mb-9 h-7 w-80 animate-pulse bg-muted/50 motion-reduce:animate-none" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 md:grid-cols-4 lg:grid-cols-6">
                {[...Array(12)].map((_, i) => (
                    <div key={i} className="aspect-[4/5] animate-pulse bg-muted/40 motion-reduce:animate-none" />
                ))}
            </div>
        </div>
    )
}
